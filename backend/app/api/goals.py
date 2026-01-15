from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import uuid4
from app import crud, schemas
from app.database.database import get_db

router = APIRouter()

def _create_guest_user(db: Session) -> int:
    """Create a lightweight guest user and return its ID."""
    from app.schemas.user import UserCreate

    for _ in range(3):
        username = f"guest_{uuid4().hex[:10]}"
        password = uuid4().hex  # 32 chars, satisfies min length
        try:
            user = crud.user.create_user(
                db=db,
                user=UserCreate(username=username, email=None, password=password)
            )
            return user.id
        except Exception:
            # Retry on rare username collisions
            continue
    raise HTTPException(status_code=500, detail="Failed to create guest user")


@router.post("/", response_model=schemas.Goal)
def create_goal(goal: schemas.GoalCreate, user_id: Optional[int] = None, db: Session = Depends(get_db)):
    try:
        # Allow anonymous goal creation by creating a guest user on demand
        if user_id is None:
            user_id = _create_guest_user(db)
        else:
            # Verify user exists before creating goal
            from app import crud as crud_module
            user = crud_module.user.get_user(db, user_id=user_id)
            if not user:
                raise HTTPException(status_code=404, detail=f"User with id {user_id} not found. Please register first.")
        
        return crud.goal.create_goal(db=db, goal=goal, user_id=user_id)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error creating goal: {e}")
        print(f"Traceback: {error_trace}")
        raise HTTPException(status_code=500, detail=f"Error creating goal: {str(e)}")

@router.get("/{goal_id}", response_model=schemas.Goal)
def read_goal(goal_id: int, db: Session = Depends(get_db)):
    db_goal = crud.goal.get_goal(db, goal_id=goal_id)
    if db_goal is None:
        raise HTTPException(status_code=404, detail="Goal not found")
    return db_goal

@router.get("/{goal_id}/nearest-deadline/")
def get_nearest_deadline(goal_id: int, db: Session = Depends(get_db)):
    """Get the nearest deadline from milestones or tasks for a goal"""
    from datetime import datetime, time
    from app.crud import crud_task
    
    nearest = None
    nearest_type = None
    nearest_title = None
    
    # Check milestones with target_date
    milestones = crud.milestone.get_milestones(db, goal_id=goal_id)
    print(f"🔍 Checking {len(milestones)} milestones for goal {goal_id}")
    for m in milestones:
        if m.target_date and not m.is_completed:
            # Convert date to datetime (start of day)
            milestone_date = datetime.combine(m.target_date, time.min)
            print(f"  📅 Milestone '{m.title}': {milestone_date}")
            if not nearest or milestone_date < nearest:
                nearest = milestone_date
                nearest_type = "milestone"
                nearest_title = m.title
    
    # Check tasks with due_date
    try:
        tasks = crud.task.get_tasks(db, goal_id=goal_id, is_completed=False)
        print(f"🔍 Checking {len(tasks)} tasks for goal {goal_id}")
        for t in tasks:
            if t.due_date:
                print(f"  ⏰ Task '{t.title}': {t.due_date}")
                if not nearest or t.due_date < nearest:
                    nearest = t.due_date
                    nearest_type = "task"
                    nearest_title = t.title
    except Exception as e:
        print(f"⚠️ Error loading tasks: {e}")
        # Tasks table might not exist yet, that's OK
    
    if nearest:
        result = {
            "deadline": nearest.isoformat(),
            "type": nearest_type,
            "formatted": nearest.strftime("%d.%m.%Y %H:%M"),
            "title": nearest_title
        }
        print(f"✅ Nearest deadline: {result}")
        return result
    
    print(f"ℹ️ No deadlines found for goal {goal_id}")
    # Return empty dict instead of None
    return {}

@router.get("/", response_model=List[schemas.Goal])
def read_goals(user_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    goals = crud.goal.get_goals(db, user_id=user_id, skip=skip, limit=limit)
    return goals

@router.put("/{goal_id}", response_model=schemas.Goal)
def update_goal(goal_id: int, goal: schemas.GoalUpdate, db: Session = Depends(get_db)):
    db_goal = crud.goal.update_goal(db, goal_id=goal_id, goal=goal)
    if db_goal is None:
        raise HTTPException(status_code=404, detail="Goal not found")
    return db_goal

@router.delete("/{goal_id}", response_model=schemas.Goal)
def delete_goal(goal_id: int, db: Session = Depends(get_db)):
    db_goal = crud.goal.delete_goal(db, goal_id=goal_id)
    if db_goal is None:
        raise HTTPException(status_code=404, detail="Goal not found")
    return db_goal