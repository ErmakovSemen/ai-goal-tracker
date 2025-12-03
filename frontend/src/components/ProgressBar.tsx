import React, { useState } from 'react';
import './ProgressBar.css';

interface Milestone {
  id: number;
  title: string;
  completed?: boolean;
  is_completed?: boolean;
  target_date?: string | null;
}

interface ProgressBarProps {
  progress: number;
  milestones?: Milestone[];
  onMilestoneClick?: (milestone: Milestone) => void;
  onSetDeadline?: (milestone: Milestone, date: string | null) => void;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  progress, 
  milestones, 
  onMilestoneClick,
  onSetDeadline 
}) => {
  const [activeMilestone, setActiveMilestone] = useState<number | null>(null);
  const [editingDeadline, setEditingDeadline] = useState<number | null>(null);

  const handleDotClick = (e: React.MouseEvent, milestone: Milestone) => {
    e.stopPropagation();
    if (activeMilestone === milestone.id) {
      setActiveMilestone(null);
      setEditingDeadline(null);
    } else {
      setActiveMilestone(milestone.id);
      setEditingDeadline(null);
    }
  };

  const handleStatusClick = (e: React.MouseEvent, milestone: Milestone) => {
    e.stopPropagation();
    if (onMilestoneClick) {
      onMilestoneClick(milestone);
    }
  };

  const handleDeadlineClick = (e: React.MouseEvent, milestoneId: number) => {
    e.stopPropagation();
    setEditingDeadline(milestoneId);
  };

  const handleDeadlineChange = (e: React.ChangeEvent<HTMLInputElement>, milestone: Milestone) => {
    const newDate = e.target.value || null;
    if (onSetDeadline) {
      onSetDeadline(milestone, newDate);
    }
    setEditingDeadline(null);
  };

  const truncateText = (text: string, maxLength: number = 25) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const isOverdue = (dateStr: string | null | undefined, completed: boolean) => {
    if (!dateStr || completed) return false;
    const deadline = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return deadline < today;
  };

  const isUpcoming = (dateStr: string | null | undefined, completed: boolean) => {
    if (!dateStr || completed) return false;
    const deadline = new Date(dateStr);
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    today.setHours(0, 0, 0, 0);
    return deadline >= today && deadline <= threeDaysFromNow;
  };

  const handleContainerClick = () => {
    setActiveMilestone(null);
    setEditingDeadline(null);
  };

  const isCompleted = (m: Milestone) => m.completed || m.is_completed || false;

  return (
    <div className="progress-container" onClick={handleContainerClick}>
      <div className="progress-bar-wrapper">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {milestones && milestones.length > 0 && (
          <div className="milestone-dots">
            {milestones.map((milestone, index) => {
              const position = ((index + 1) / (milestones.length + 1)) * 100;
              const completed = isCompleted(milestone);
              const overdue = isOverdue(milestone.target_date, completed);
              const upcoming = isUpcoming(milestone.target_date, completed);
              
              return (
                <div
                  key={milestone.id}
                  className={`milestone-dot-container ${completed ? 'completed' : ''} ${overdue ? 'overdue' : ''} ${upcoming ? 'upcoming' : ''} ${activeMilestone === milestone.id ? 'active' : ''}`}
                  style={{ left: `${position}%` }}
                >
                  <button
                    className={`milestone-dot ${completed ? 'completed' : ''} ${overdue ? 'overdue' : ''} ${upcoming ? 'upcoming' : ''}`}
                    onClick={(e) => handleDotClick(e, milestone)}
                    title={milestone.title}
                  />
                  
                  {activeMilestone === milestone.id && (
                    <div 
                      className={`milestone-tooltip ${position > 70 ? 'left' : position < 30 ? 'right' : ''}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="tooltip-content">
                        <span className="tooltip-text">{truncateText(milestone.title)}</span>
                        
                        <div className="tooltip-deadline">
                          {editingDeadline === milestone.id ? (
                            <input
                              type="date"
                              className="deadline-input"
                              defaultValue={milestone.target_date || ''}
                              onChange={(e) => handleDeadlineChange(e, milestone)}
                              onBlur={() => setEditingDeadline(null)}
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span 
                              className={`deadline-text ${overdue ? 'overdue' : ''} ${upcoming ? 'upcoming' : ''}`}
                              onClick={(e) => handleDeadlineClick(e, milestone.id)}
                            >
                              {milestone.target_date 
                                ? `📅 ${formatDate(milestone.target_date)}`
                                : '+ дедлайн'
                              }
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <button 
                        className={`tooltip-status-btn ${completed ? 'done' : 'pending'}`}
                        onClick={(e) => handleStatusClick(e, milestone)}
                      >
                        {completed ? '✓' : '○'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressBar;
