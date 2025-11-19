from sqlalchemy.orm import Session
from app.models.report import Report
from app.schemas.report import ReportCreate, ReportUpdate

def get_report(db: Session, report_id: int):
    return db.query(Report).filter(Report.id == report_id).first()

def get_reports(db: Session, goal_id: int, skip: int = 0, limit: int = 100):
    return db.query(Report).filter(Report.goal_id == goal_id).offset(skip).limit(limit).all()

def create_report(db: Session, report: ReportCreate):
    db_report = Report(**report.dict())
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

def update_report(db: Session, report_id: int, report: ReportUpdate):
    db_report = db.query(Report).filter(Report.id == report_id).first()
    if db_report:
        update_data = report.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_report, key, value)
        db.commit()
        db.refresh(db_report)
    return db_report

def delete_report(db: Session, report_id: int):
    db_report = db.query(Report).filter(Report.id == report_id).first()
    if db_report:
        db.delete(db_report)
        db.commit()
    return db_report