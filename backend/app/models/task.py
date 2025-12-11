from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.database import Base

class Task(Base):
    """
    Задача - краткосрочное действие с конкретным дедлайном (часы/дни)
    Отличается от Milestone тем, что:
    - Milestone - большая промежуточная цель (недели/месяцы)
    - Task - конкретное действие на сегодня/завтра/эту неделю
    """
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    milestone_id = Column(Integer, ForeignKey("milestones.id"), nullable=True)  # Опциональная связь с milestone
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=True)  # Конкретная дата и время дедлайна
    is_completed = Column(Boolean, default=False)
    priority = Column(String, default="medium")  # low, medium, high
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    goal = relationship("Goal", back_populates="tasks")
    milestone = relationship("Milestone", back_populates="tasks")

