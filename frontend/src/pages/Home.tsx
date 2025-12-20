import React, { useState, useEffect } from 'react';
import { goalsAPI, milestonesAPI, tasksAPI } from '../services/api';
import './Home.css';

interface HomeProps {
  userId: number;
  onGoalClick?: (goalId: number) => void;
}

interface GoalStats {
  id: number;
  title: string;
  progress: number;
  nearestDeadline?: {
    deadline: string;
    type: 'milestone' | 'task';
    title: string;
    formatted: string;
  };
  milestoneCount: number;
  completedMilestones: number;
  taskCount: number;
  completedTasks: number;
}

const Home: React.FC<HomeProps> = ({ userId, onGoalClick }) => {
  const [goals, setGoals] = useState<GoalStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const loadData = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const fetchedGoals = await goalsAPI.getAll(userId);
      
      const goalsWithStats = await Promise.all(
        fetchedGoals.map(async (goal) => {
          try {
            const milestones = await milestonesAPI.getByGoalId(goal.id);
            const completedMilestones = milestones.filter(m => m.completed || m.is_completed).length;
            const progress = milestones.length > 0 
              ? Math.round((completedMilestones / milestones.length) * 100) 
              : 0;

            let tasks: any[] = [];
            try {
              tasks = await tasksAPI.getByGoalId(goal.id, false);
            } catch (err) {
              console.log('Tasks not available yet');
            }

            let nearestDeadline = undefined;
            try {
              const { getApiUrl } = await import('../config/api');
              const token = localStorage.getItem('token');
              const response = await fetch(getApiUrl(`/api/goals/${goal.id}/nearest-deadline/`), {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              if (response.ok) {
                const deadlineData = await response.json();
                if (deadlineData && deadlineData.deadline) {
                  nearestDeadline = deadlineData;
                }
              }
            } catch (err) {
              console.log('Failed to load nearest deadline');
            }

            return {
              id: goal.id,
              title: goal.title,
              progress,
              nearestDeadline,
              milestoneCount: milestones.length,
              completedMilestones,
              taskCount: tasks.length,
              completedTasks: tasks.filter(t => t.is_completed).length,
            };
          } catch (err) {
            console.error(`Error loading stats for goal ${goal.id}:`, err);
            return {
              id: goal.id,
              title: goal.title,
              progress: 0,
              milestoneCount: 0,
              completedMilestones: 0,
              taskCount: 0,
              completedTasks: 0,
            };
          }
        })
      );

      setGoals(goalsWithStats);
    } catch (err) {
      console.error('Failed to load home data:', err);
    } finally {
      setLoading(false);
    }
  };

  const upcomingDeadlines = goals
    .filter(g => g.nearestDeadline)
    .sort((a, b) => {
      if (!a.nearestDeadline || !b.nearestDeadline) return 0;
      return new Date(a.nearestDeadline.deadline).getTime() - new Date(b.nearestDeadline.deadline).getTime();
    })
    .slice(0, 3);

  const handleGoalClick = (goalId: number) => {
    if (onGoalClick) {
      onGoalClick(goalId);
      // Switch to chat tab
      const chatTab = document.querySelector('[aria-label="Общение"]') as HTMLElement;
      if (chatTab) {
        chatTab.click();
      }
    }
  };

  if (loading) {
    return (
      <div className="home-page">
        <div className="home-loading">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="home-header">
        <h1>Главная</h1>
      </div>

      <div className="home-content">
        {/* Ближайшие дедлайны */}
        {upcomingDeadlines.length > 0 && (
          <section className="home-widget">
            <div className="widget-header">
              <span className="widget-title">Ближайшие дедлайны</span>
            </div>
            <div className="widget-content">
              {upcomingDeadlines.map((goal) => (
                goal.nearestDeadline && (
                  <div 
                    key={goal.id} 
                    className="deadline-widget"
                    onClick={() => handleGoalClick(goal.id)}
                  >
                    <div className="deadline-widget-content">
                      <div className="deadline-widget-title">{goal.title}</div>
                      <div className="deadline-widget-task">{goal.nearestDeadline.title}</div>
                      <div className="deadline-widget-date">{goal.nearestDeadline.formatted}</div>
                    </div>
                    <div className="deadline-widget-icon">
                      {goal.nearestDeadline.type === 'milestone' ? '🎯' : '📝'}
                    </div>
                  </div>
                )
              ))}
            </div>
          </section>
        )}

        {/* Цели */}
        <section className="home-widget">
          <div className="widget-header">
            <span className="widget-title">Мои цели</span>
            <span className="widget-count">{goals.length}</span>
          </div>
          <div className="widget-content">
            {goals.length > 0 ? (
              goals.map((goal) => (
                <div 
                  key={goal.id} 
                  className="goal-widget"
                  onClick={() => handleGoalClick(goal.id)}
                >
                  <div className="goal-widget-content">
                    <div className="goal-widget-title">{goal.title}</div>
                    <div className="goal-widget-progress-container">
                      <div className="goal-widget-progress-bar">
                        <div 
                          className="goal-widget-progress-fill" 
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                      <span className="goal-widget-progress-text">{goal.progress}%</span>
                    </div>
                    <div className="goal-widget-meta">
                      {goal.milestoneCount > 0 && (
                        <span className="goal-widget-meta-item">
                          {goal.completedMilestones}/{goal.milestoneCount} milestones
                        </span>
                      )}
                      {goal.taskCount > 0 && (
                        <span className="goal-widget-meta-item">
                          {goal.completedTasks}/{goal.taskCount} задач
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">У вас пока нет целей. Создайте первую!</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
