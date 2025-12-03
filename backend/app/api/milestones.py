from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import crud, schemas
from app.database.database import get_db

router = APIRouter()

@router.post("/", response_model=schemas.Milestone)
def create_milestone(milestone: schemas.MilestoneCreate, db: Session = Depends(get_db)):
    return crud.milestone.create_milestone(db=db, milestone=milestone)

@router.get("/{milestone_id}", response_model=schemas.Milestone)
def read_milestone(milestone_id: int, db: Session = Depends(get_db)):
    db_milestone = crud.milestone.get_milestone(db, milestone_id=milestone_id)
    if db_milestone is None:
        raise HTTPException(status_code=404, detail="Milestone not found")
    return db_milestone

@router.get("/", response_model=List[schemas.Milestone])
def read_milestones(goal_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    try:
        milestones = crud.milestone.get_milestones(db, goal_id=goal_id, skip=skip, limit=limit)
        return milestones or []
    except Exception as e:
        import traceback
        print(f"Error getting milestones: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error getting milestones: {str(e)}")

@router.put("/{milestone_id}", response_model=schemas.Milestone)
def update_milestone(milestone_id: int, milestone: schemas.MilestoneUpdate, db: Session = Depends(get_db)):
    # Handle both 'completed' and 'is_completed' fields
    update_data = milestone.dict(exclude_unset=True)
    if 'completed' in update_data and 'is_completed' not in update_data:
        update_data['is_completed'] = update_data.pop('completed')
    
    milestone_update = schemas.MilestoneUpdate(**update_data)
    db_milestone = crud.milestone.update_milestone(db, milestone_id=milestone_id, milestone=milestone_update)
    if db_milestone is None:
        raise HTTPException(status_code=404, detail="Milestone not found")
    return db_milestone

@router.delete("/{milestone_id}", response_model=schemas.Milestone)
def delete_milestone(milestone_id: int, db: Session = Depends(get_db)):
    db_milestone = crud.milestone.delete_milestone(db, milestone_id=milestone_id)
    if db_milestone is None:
        raise HTTPException(status_code=404, detail="Milestone not found")
    return db_milestone