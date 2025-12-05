import React from 'react';
import './GoalList.css';

interface Goal {
  id: number;
  title: string;
  description?: string;
  progress?: number;
  lastMessage?: string;
  lastMessageTime?: string;
}

interface GoalListProps {
  goals: Goal[];
  selectedGoalId: number | null;
  onSelectGoal: (goalId: number) => void;
  onCreateNew: () => void;
  onDeleteGoal?: (goalId: number) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const GoalList: React.FC<GoalListProps> = ({ goals, selectedGoalId, onCreateNew, onSelectGoal, onDeleteGoal, isCollapsed, onToggleCollapse }) => {
  return (
    <div className={`goal-list ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="goal-list-header">
        {!isCollapsed && <h2>Цели</h2>}
        <div className="goal-list-actions">
          <button className="collapse-button" onClick={onToggleCollapse} title={isCollapsed ? "Expand" : "Collapse"}>
            {isCollapsed ? '→' : '←'}
          </button>
        </div>
      </div>
      {!isCollapsed && (
        <div className="goal-list-items">
          {/* New Goal button as first item */}
          <div
            className="goal-item new-goal-item"
            onClick={onCreateNew}
          >
            <div className="goal-item-header">
              <h3>✨ Новая цель</h3>
            </div>
            <p className="goal-item-preview">Создать цель с AI или вручную</p>
          </div>
          
          {goals.length === 0 ? (
            <div className="empty-state">
              <p>Пока нет целей</p>
            </div>
          ) : (
            goals.map((goal) => (
              <div
                key={goal.id}
                className={`goal-item ${selectedGoalId === goal.id ? 'active' : ''}`}
                onClick={() => onSelectGoal(goal.id)}
              >
                <div className="goal-item-header">
                  <h3>{goal.title}</h3>
                  <div className="goal-item-actions">
                    {goal.progress !== undefined && (
                      <span className="progress-badge">{goal.progress}%</span>
                    )}
                    {onDeleteGoal && (
                      <button
                        className="delete-goal-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Удалить цель "${goal.title}"? Это действие нельзя отменить.`)) {
                            onDeleteGoal(goal.id);
                          }
                        }}
                        title="Удалить цель"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
                {goal.lastMessage && (
                  <p className="goal-item-preview">{goal.lastMessage}</p>
                )}
                {goal.lastMessageTime && (
                  <span className="goal-item-time">{goal.lastMessageTime}</span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default GoalList;

