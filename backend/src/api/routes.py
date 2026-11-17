from fastapi import APIRouter

from . import data

router = APIRouter(prefix="/api")

@router.get("/snapshot", summary="Data snapshot")
def snapshot() -> dict:
    return data.snapshot()