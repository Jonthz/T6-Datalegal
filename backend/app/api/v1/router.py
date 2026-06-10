from fastapi import APIRouter
 
from app.api.v1 import catalogs
 
api_router = APIRouter()
 
api_router.include_router(catalogs.router)