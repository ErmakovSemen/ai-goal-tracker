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
    milestones = crud.milestone.get_milestones(db, goal_id=goal_id, skip=skip, limit=limit)
    return milestones

@router.put("/{milestone_id}", response_model=schemas.Milestone)
def update_milestone(milestone_id: int, milestone: schemas.MilestoneUpdate, db: Session = Depends(get_db)):
    db_milestone = crud.milestone.update_milestone(db, milestone_id=milestone_id, milestone=milestone)
    if db_milestone is None:
        raise HTTPException(status_code=404, detail="Milestone not found")
    return db_milestone

@router.delete("/{milestone_id}", response_model=schemas.Milestone)
def delete_milestone(milestone_id: int, db: Session = Depends(get_db)):
    db_milestone = crud.milestone.delete_milestone(db, milestone_id=milestone_id)
    if db_milestone is None:
        raise HTTPException(status_code=404, detail="Milestone not found")
    return db_milestone