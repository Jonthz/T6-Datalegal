from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_db, require_permission
from app.models.audit_log import AuditLog
from app.models.department import Department
from app.models.user import User
from app.schemas.department import DepartmentCreate, DepartmentRead, DepartmentUpdate

router = APIRouter(prefix="/departments", tags=["departments"])


@router.get("", response_model=list[DepartmentRead])
def list_departments(
    _: Annotated[User, Depends(require_permission("departments", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
):
    """List departments."""
    return (
        db.query(Department)
        .filter(Department.tenant_id == tenant_id)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("", response_model=DepartmentRead, status_code=status.HTTP_201_CREATED)
def create_department(
    body: DepartmentCreate,
    current_user: Annotated[User, Depends(require_permission("departments", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Create department."""
    dept = Department(tenant_id=tenant_id, name=body.name, head_user_id=body.head_user_id)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    AuditLog.create_log(
        db,
        action="department_create",
        resource="departments",
        tenant_id=tenant_id,
        user_id=current_user.id,
        detail=f"Created department id={dept.id}",
    )
    return dept


@router.get("/{dept_id}", response_model=DepartmentRead)
def get_department(
    dept_id: int,
    _: Annotated[User, Depends(require_permission("departments", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Return department."""
    dept = (
        db.query(Department)
        .filter(Department.id == dept_id, Department.tenant_id == tenant_id)
        .first()
    )
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found.")
    return dept


@router.put("/{dept_id}", response_model=DepartmentRead)
def update_department(
    dept_id: int,
    body: DepartmentUpdate,
    current_user: Annotated[User, Depends(require_permission("departments", "u"))],  # pylint: disable=unused-argument
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Update department."""
    dept = (
        db.query(Department)
        .filter(Department.id == dept_id, Department.tenant_id == tenant_id)
        .first()
    )
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found.")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(dept, field, value)
    db.commit()
    db.refresh(dept)
    return dept


@router.delete("/{dept_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(
    dept_id: int,
    current_user: Annotated[User, Depends(require_permission("departments", "d"))],  # pylint: disable=unused-argument
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Delete department."""
    dept = (
        db.query(Department)
        .filter(Department.id == dept_id, Department.tenant_id == tenant_id)
        .first()
    )
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found.")
    db.delete(dept)
    db.commit()
