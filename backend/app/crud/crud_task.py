from sqlalchemy.orm import Session
from typing import List, Optional
from app import schemas
from app.models.task import Task
from datetime import datetime

def create_task(db: Session, task: schemas.TaskCreate) -> Task:
    """Create a new task"""
    db_task = Task(
        title=task.title,
        description=task.description,
        milestone_id=task.milestone_id,
        goal_id=task.goal_id,
        due_date=task.due_date,
        priority=task.priority or "medium",
        is_completed=False
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

def get_task(db: Session, task_id: int) -> Optional[Task]:
    """Get a task by ID"""
    return db.query(Task).filter(Task.id == task_id).first()

def get_tasks(
    db: Session,
    goal_id: Optional[int] = None,
    milestone_id: Optional[int] = None,
    is_completed: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Task]:
    """Get tasks with optional filters"""
    query = db.query(Task)
    
    if goal_id is not None:
        query = query.filter(Task.goal_id == goal_id)
    if milestone_id is not None:
        query = query.filter(Task.milestone_id == milestone_id)
    if is_completed is not None:
        query = query.filter(Task.is_completed == is_completed)
    
    return query.offset(skip).limit(limit).all()

def get_upcoming_tasks(db: Session, goal_id: int, limit: int = 5) -> List[Task]:
    """Get upcoming tasks sorted by due_date"""
    return db.query(Task).filter(
        Task.goal_id == goal_id,
        Task.is_completed == False,
        Task.due_date >= datetime.now()
    ).order_by(Task.due_date.asc()).limit(limit).all()

def update_task(db: Session, task_id: int, task: schemas.TaskUpdate) -> Optional[Task]:
    """Update a task"""
    db_task = get_task(db, task_id)
    if not db_task:
        return None
    
    update_data = task.dict(exclude_unset=True)
    
    # Handle is_completed
    if "is_completed" in update_data:
        db_task.is_completed = update_data["is_completed"]
        if update_data["is_completed"] and not db_task.completed_at:
            db_task.completed_at = datetime.now()
        elif not update_data["is_completed"]:
            db_task.completed_at = None
    
    # Update other fields
    for field, value in update_data.items():
        if field != "is_completed" and field != "completed_at":
            setattr(db_task, field, value)
    
    db.commit()
    db.refresh(db_task)
    return db_task

def delete_task(db: Session, task_id: int) -> Optional[Task]:
    """Delete a task"""
    db_task = get_task(db, task_id)
    if not db_task:
        return None
    db.delete(db_task)
    db.commit()
    return db_task

