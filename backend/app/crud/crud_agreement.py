from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime, timedelta
from typing import List, Optional
from app.models.agreement import Agreement, AgreementStatus
from app.schemas import agreement as schemas

def create_agreement(db: Session, agreement: schemas.AgreementCreate) -> Agreement:
    db_agreement = Agreement(
        goal_id=agreement.goal_id,
        chat_id=agreement.chat_id,
        description=agreement.description,
        deadline=agreement.deadline,
        status=AgreementStatus.PENDING
    )
    db.add(db_agreement)
    db.commit()
    db.refresh(db_agreement)
    return db_agreement

def get_agreement(db: Session, agreement_id: int) -> Optional[Agreement]:
    return db.query(Agreement).filter(Agreement.id == agreement_id).first()

def get_agreements_by_goal(db: Session, goal_id: int) -> List[Agreement]:
    return db.query(Agreement).filter(Agreement.goal_id == goal_id).all()

def get_pending_agreements(db: Session, goal_id: int) -> List[Agreement]:
    return db.query(Agreement).filter(
        and_(
            Agreement.goal_id == goal_id,
            Agreement.status == AgreementStatus.PENDING
        )
    ).all()

def get_due_agreements(db: Session) -> List[Agreement]:
    """Get agreements that are due (deadline passed) and still pending"""
    now = datetime.utcnow()
    return db.query(Agreement).filter(
        and_(
            Agreement.status == AgreementStatus.PENDING,
            Agreement.deadline <= now,
            Agreement.checklist_sent == False
        )
    ).all()

def get_upcoming_agreements(db: Session, hours_ahead: int = 24) -> List[Agreement]:
    """Get agreements with deadline coming up in the next N hours"""
    now = datetime.utcnow()
    future = now + timedelta(hours=hours_ahead)
    return db.query(Agreement).filter(
        and_(
            Agreement.status == AgreementStatus.PENDING,
            Agreement.deadline > now,
            Agreement.deadline <= future,
            Agreement.reminder_sent == False
        )
    ).all()

def update_agreement(db: Session, agreement_id: int, update: schemas.AgreementUpdate) -> Optional[Agreement]:
    db_agreement = get_agreement(db, agreement_id)
    if db_agreement:
        update_data = update.dict(exclude_unset=True)
        if update_data.get("status") == AgreementStatus.COMPLETED:
            update_data["completed_at"] = datetime.utcnow()
        for key, value in update_data.items():
            setattr(db_agreement, key, value)
        db.commit()
        db.refresh(db_agreement)
    return db_agreement

def mark_reminder_sent(db: Session, agreement_id: int) -> Optional[Agreement]:
    return update_agreement(db, agreement_id, schemas.AgreementUpdate(reminder_sent=True))

def mark_checklist_sent(db: Session, agreement_id: int) -> Optional[Agreement]:
    return update_agreement(db, agreement_id, schemas.AgreementUpdate(checklist_sent=True))

def complete_agreement(db: Session, agreement_id: int) -> Optional[Agreement]:
    return update_agreement(db, agreement_id, schemas.AgreementUpdate(status=AgreementStatus.COMPLETED))

def miss_agreement(db: Session, agreement_id: int) -> Optional[Agreement]:
    return update_agreement(db, agreement_id, schemas.AgreementUpdate(status=AgreementStatus.MISSED))

