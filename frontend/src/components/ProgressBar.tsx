import React from 'react';
import './ProgressBar.css';

interface ProgressBarProps {
  progress: number;
  milestones?: { id: number; title: string; completed: boolean }[];
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, milestones }) => {
  return (
    <div className="progress-container">
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      {milestones && (
        <div className="milestones">
          {milestones.map((milestone) => (
            <div 
              key={milestone.id} 
              className={`milestone ${milestone.completed ? 'completed' : ''}`}
            >
              <div className="milestone-dot"></div>
              <div className="milestone-title">{milestone.title}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProgressBar;