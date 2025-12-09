from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import crud, schemas
from app.database.database import get_db

router = APIRouter()

@router.post("/", response_model=schemas.Goal)
def create_goal(goal: schemas.GoalCreate, user_id: int, db: Session = Depends(get_db)):
    try:
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