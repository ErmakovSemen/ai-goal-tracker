from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.database import Base

class Milestone(Base):
    __tablename__ = "milestones"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=False)
    target_date = Column(Date, nullable=False)
    progress = Column(Float, default=0.0)  # 0.0 to 100.0
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    goal = relationship("Goal", back_populates="milestones")