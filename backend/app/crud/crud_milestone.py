from sqlalchemy.orm import Session
from app.models.milestone import Milestone
from app.schemas.milestone import MilestoneCreate, MilestoneUpdate

def get_milestone(db: Session, milestone_id: int):
    return db.query(Milestone).filter(Milestone.id == milestone_id).first()

def get_milestones(db: Session, goal_id: int, skip: int = 0, limit: int = 100):
    return db.query(Milestone).filter(Milestone.goal_id == goal_id).offset(skip).limit(limit).all()

def create_milestone(db: Session, milestone: MilestoneCreate):
    db_milestone = Milestone(**milestone.dict())
    db.add(db_milestone)
    db.commit()
    db.refresh(db_milestone)
    return db_milestone

def update_milestone(db: Session, milestone_id: int, milestone: MilestoneUpdate):
    db_milestone = db.query(Milestone).filter(Milestone.id == milestone_id).first()
    if db_milestone:
        update_data = milestone.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_milestone, key, value)
        db.commit()
        db.refresh(db_milestone)
    return db_milestone

def delete_milestone(db: Session, milestone_id: int):
    db_milestone = db.query(Milestone).filter(Milestone.id == milestone_id).first()
    if db_milestone:
        db.delete(db_milestone)
        db.commit()
    return db_milestone