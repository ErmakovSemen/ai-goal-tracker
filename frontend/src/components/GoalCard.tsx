import React from 'react';
import ProgressBar from './ProgressBar';
import './GoalCard.css';

interface GoalCardProps {
  id: number;
  title: string;
  progress: number;
  milestones: { id: number; title: string; completed: boolean }[];
  onGoalClick: (id: number) => void;
}

const GoalCard: React.FC<GoalCardProps> = ({ id, title, progress, milestones, onGoalClick }) => {
  return (
    <div className="goal-card" onClick={() => onGoalClick(id)}>
      <h3 className="goal-title">{title}</h3>
      <div className="goal-progress">
        <span className="progress-text">{Math.round(progress)}% complete</span>
        <ProgressBar progress={progress} milestones={milestones} />
      </div>
    </div>
  );
};

export default GoalCard;