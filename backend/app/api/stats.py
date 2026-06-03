"""Public stats endpoints — lightweight metrics for the build-in-public series.

Exposes a read-only user count so progress toward the first-100-users goal can be
shown live on camera and in the Telegram channel.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.user import User

# Usernames created by automated e2e checks — excluded from the public count.
TEST_PREFIXES = ("e2e_", "v_", "test_", "test")

router = APIRouter()

# Headline goal for the launch series ("first 100 users").
USERS_GOAL = 100


@router.get("/users-count")
def users_count(db: Session = Depends(get_db)):
    """Total registered users + progress toward the launch goal."""
    q = db.query(User)
    for pref in TEST_PREFIXES:
        q = q.filter(~User.username.like(f"{pref}%"))
    total = q.count()
    remaining = max(USERS_GOAL - total, 0)
    pct = round(min(total / USERS_GOAL * 100, 100), 1) if USERS_GOAL else 0
    return {
        "users": total,
        "goal": USERS_GOAL,
        "remaining": remaining,
        "progress_pct": pct,
    }
