from sqlalchemy.orm import Session
from app.models.goal import Goal
from app.models.milestone import Milestone
from app.schemas.goal import GoalCreate, GoalUpdate

def get_goal(db: Session, goal_id: int):
    return db.query(Goal).filter(Goal.id == goal_id).first()

def get_goals(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(Goal).filter(Goal.user_id == user_id).offset(skip).limit(limit).all()

def create_goal(db: Session, goal: GoalCreate, user_id: int):
    db_goal = Goal(**goal.dict(), user_id=user_id)
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return db_goal

def update_goal(db: Session, goal_id: int, goal: GoalUpdate):
    db_goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if db_goal:
        update_data = goal.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_goal, key, value)
        db.commit()
        db.refresh(db_goal)
    return db_goal

def delete_goal(db: Session, goal_id: int):
    db_goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if db_goal:
        db.delete(db_goal)
        db.commit()
    return db_goal

def get_goal_with_milestones(db: Session, goal_id: int):
    return db.query(Goal).filter(Goal.id == goal_id).first()