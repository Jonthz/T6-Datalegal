from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_db, require_permission
from app.models.training import Enrollment, TrainingMaterial, TrainingModule, TrainingProgram
from app.models.user import User
from app.schemas.training import (
    EnrollmentCreate,
    EnrollmentRead,
    EnrollmentUpdate,
    MaterialCreate,
    MaterialRead,
    MaterialUpdate,
    ModuleCreate,
    ModuleRead,
    ModuleUpdate,
    ProgramCreate,
    ProgramRead,
    ProgramUpdate,
)

router = APIRouter(prefix="/training", tags=["training"])


# --- Programs ---


@router.get("/programs", response_model=list[ProgramRead])
def list_programs(
    _: Annotated[User, Depends(require_permission("training", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
):
    """List programs."""
    return (
        db.query(TrainingProgram)
        .filter(TrainingProgram.tenant_id == tenant_id)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("/programs", response_model=ProgramRead, status_code=status.HTTP_201_CREATED)
def create_program(
    body: ProgramCreate,
    _: Annotated[User, Depends(require_permission("training", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Create program."""
    program = TrainingProgram(tenant_id=tenant_id, title=body.title, description=body.description)
    db.add(program)
    db.commit()
    db.refresh(program)
    return program


@router.get("/programs/{program_id}", response_model=ProgramRead)
def get_program(
    program_id: int,
    _: Annotated[User, Depends(require_permission("training", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Return program."""
    program = (
        db.query(TrainingProgram)
        .filter(TrainingProgram.id == program_id, TrainingProgram.tenant_id == tenant_id)
        .first()
    )
    if not program:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Program not found.")
    return program


@router.put("/programs/{program_id}", response_model=ProgramRead)
def update_program(
    program_id: int,
    body: ProgramUpdate,
    _: Annotated[User, Depends(require_permission("training", "u"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Update program."""
    program = (
        db.query(TrainingProgram)
        .filter(TrainingProgram.id == program_id, TrainingProgram.tenant_id == tenant_id)
        .first()
    )
    if not program:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Program not found.")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(program, field, value)
    db.commit()
    db.refresh(program)
    return program


@router.delete("/programs/{program_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_program(
    program_id: int,
    _: Annotated[User, Depends(require_permission("training", "d"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Delete program."""
    program = (
        db.query(TrainingProgram)
        .filter(TrainingProgram.id == program_id, TrainingProgram.tenant_id == tenant_id)
        .first()
    )
    if not program:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Program not found.")
    db.delete(program)
    db.commit()


# --- Modules ---


@router.get("/programs/{program_id}/modules", response_model=list[ModuleRead])
def list_modules(
    program_id: int,
    _: Annotated[User, Depends(require_permission("training", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """List modules."""
    return (
        db.query(TrainingModule)
        .filter(TrainingModule.program_id == program_id, TrainingModule.tenant_id == tenant_id)
        .order_by(TrainingModule.order)
        .all()
    )


@router.post(
    "/programs/{program_id}/modules", response_model=ModuleRead, status_code=status.HTTP_201_CREATED
)
def create_module(
    program_id: int,
    body: ModuleCreate,
    _: Annotated[User, Depends(require_permission("training", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Create module."""
    program = (
        db.query(TrainingProgram)
        .filter(TrainingProgram.id == program_id, TrainingProgram.tenant_id == tenant_id)
        .first()
    )
    if not program:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Program not found.")
    module = TrainingModule(
        tenant_id=tenant_id,
        program_id=program_id,
        title=body.title,
        description=body.description,
        order=body.order,
    )
    db.add(module)
    db.commit()
    db.refresh(module)
    return module


@router.put("/modules/{module_id}", response_model=ModuleRead)
def update_module(
    module_id: int,
    body: ModuleUpdate,
    _: Annotated[User, Depends(require_permission("training", "u"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Update module."""
    module = (
        db.query(TrainingModule)
        .filter(TrainingModule.id == module_id, TrainingModule.tenant_id == tenant_id)
        .first()
    )
    if not module:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found.")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(module, field, value)
    db.commit()
    db.refresh(module)
    return module


# --- Materials ---


@router.get("/modules/{module_id}/materials", response_model=list[MaterialRead])
def list_materials(
    module_id: int,
    _: Annotated[User, Depends(require_permission("training", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """List materials."""
    return (
        db.query(TrainingMaterial)
        .filter(TrainingMaterial.module_id == module_id, TrainingMaterial.tenant_id == tenant_id)
        .all()
    )


@router.post(
    "/modules/{module_id}/materials",
    response_model=MaterialRead,
    status_code=status.HTTP_201_CREATED,
)
def create_material(
    module_id: int,
    body: MaterialCreate,
    _: Annotated[User, Depends(require_permission("training", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Create material."""
    module = (
        db.query(TrainingModule)
        .filter(TrainingModule.id == module_id, TrainingModule.tenant_id == tenant_id)
        .first()
    )
    if not module:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found.")
    material = TrainingMaterial(
        tenant_id=tenant_id,
        module_id=module_id,
        title=body.title,
        content_type=body.content_type,
        url=body.url,
        content=body.content,
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


@router.put("/materials/{material_id}", response_model=MaterialRead)
def update_material(
    material_id: int,
    body: MaterialUpdate,
    _: Annotated[User, Depends(require_permission("training", "u"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Update material."""
    material = (
        db.query(TrainingMaterial)
        .filter(TrainingMaterial.id == material_id, TrainingMaterial.tenant_id == tenant_id)
        .first()
    )
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found.")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(material, field, value)
    db.commit()
    db.refresh(material)
    return material


# --- Enrollments ---


@router.get("/enrollments", response_model=list[EnrollmentRead])
def list_enrollments(
    _: Annotated[User, Depends(require_permission("training", "r"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
    user_id: int | None = Query(None),
    program_id: int | None = Query(None),
):
    """List enrollments."""
    q = db.query(Enrollment).filter(Enrollment.tenant_id == tenant_id)
    if user_id:
        q = q.filter(Enrollment.user_id == user_id)
    if program_id:
        q = q.filter(Enrollment.program_id == program_id)
    return q.all()


@router.post("/enrollments", response_model=EnrollmentRead, status_code=status.HTTP_201_CREATED)
def create_enrollment(
    body: EnrollmentCreate,
    _: Annotated[User, Depends(require_permission("training", "c"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Create enrollment."""
    enrollment = Enrollment(
        tenant_id=tenant_id,
        user_id=body.user_id,
        program_id=body.program_id,
        enrolled_at=datetime.now(timezone.utc),
        progress_pct=0,
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment


@router.put("/enrollments/{enrollment_id}", response_model=EnrollmentRead)
def update_enrollment(
    enrollment_id: int,
    body: EnrollmentUpdate,
    _: Annotated[User, Depends(require_permission("training", "u"))],
    tenant_id: int = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Update enrollment."""
    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.id == enrollment_id, Enrollment.tenant_id == tenant_id)
        .first()
    )
    if not enrollment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment not found.")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(enrollment, field, value)
    db.commit()
    db.refresh(enrollment)
    return enrollment
