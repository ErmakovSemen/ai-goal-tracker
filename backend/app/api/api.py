from fastapi import APIRouter
from app.api import users, goals, milestones, chats, reports, ai, push

router = APIRouter()

router.include_router(users.router, prefix="/users", tags=["users"])
router.include_router(goals.router, prefix="/goals", tags=["goals"])
router.include_router(milestones.router, prefix="/milestones", tags=["milestones"])
router.include_router(chats.router, prefix="/chats", tags=["chats"])
router.include_router(reports.router, prefix="/reports", tags=["reports"])
router.include_router(ai.router, prefix="/ai", tags=["ai"])
router.include_router(push.router, prefix="/push", tags=["push"])