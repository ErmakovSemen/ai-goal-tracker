from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import crud, schemas
from app.database.database import get_db

router = APIRouter()

@router.post("/", response_model=schemas.Report)
def create_report(report: schemas.ReportCreate, db: Session = Depends(get_db)):
    return crud.report.create_report(db=db, report=report)

@router.get("/{report_id}", response_model=schemas.Report)
def read_report(report_id: int, db: Session = Depends(get_db)):
    db_report = crud.report.get_report(db, report_id=report_id)
    if db_report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return db_report

@router.get("/", response_model=List[schemas.Report])
def read_reports(goal_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    reports = crud.report.get_reports(db, goal_id=goal_id, skip=skip, limit=limit)
    return reports

@router.put("/{report_id}", response_model=schemas.Report)
def update_report(report_id: int, report: schemas.ReportUpdate, db: Session = Depends(get_db)):
    db_report = crud.report.update_report(db, report_id=report_id, report=report)
    if db_report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return db_report

@router.delete("/{report_id}", response_model=schemas.Report)
def delete_report(report_id: int, db: Session = Depends(get_db)):
    db_report = crud.report.delete_report(db, report_id=report_id)
    if db_report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return db_report