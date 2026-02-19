import React, { useState, useEffect } from 'react';
import { goalsAPI, milestonesAPI, tasksAPI } from '../services/api';
import { useI18n } from '../i18n';
import TrainerPickerModal from '../components/TrainerPickerModal';
import {
  getTrainerImage,
  loadActiveTrainerSelection,
  saveActiveTrainerSelection,
  TrainerGender,
} from '../config/trainerVisualConfig';
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
  const { t } = useI18n();
  const [goals, setGoals] = useState<GoalStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTrainerModalOpen, setIsTrainerModalOpen] = useState(false);
  const [trainerSelection, setTrainerSelection] = useState(() => loadActiveTrainerSelection());
  const showTrainerTestBadge = (process.env.REACT_APP_TRAINER_TEST_BADGE ?? 'true')
    .toLowerCase()
    .trim() !== 'false';

  const loadData = React.useCallback(async () => {
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
              const token = localStorage.getItem('auth_token');
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
  }, [userId]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

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
      // Switch to chat tab after a short delay to ensure state is updated
      setTimeout(() => {
        const chatTab = document.querySelector('[aria-label="Общение"]') as HTMLElement;
        if (chatTab) {
          chatTab.click();
        }
      }, 100);
    }
  };

  const handleTrainerConfirm = (trainerId: string, gender: TrainerGender) => {
    saveActiveTrainerSelection(trainerId, gender);
    setTrainerSelection({ trainerId, gender });
    setIsTrainerModalOpen(false);
  };

  if (loading) {
    return (
      <div className="home-page">
        <div className="home-loading">
          <div className="loading-spinner"></div>
          <div>{t('loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="home-header">
        <div className="home-header-content">
          <div className="home-header-text">
            <div className="home-title-row">
              <h1>{t('welcome_title')}</h1>
              {showTrainerTestBadge && <span className="trainer-test-badge">тест тренера</span>}
            </div>
            <p className="home-subtitle">{t('welcome_subtitle')}</p>
          </div>
          <button
            type="button"
            className="home-header-trainer-trigger"
            onClick={() => setIsTrainerModalOpen(true)}
            aria-label="Открыть выбор тренера"
          >
            <img
              src={getTrainerImage(trainerSelection.trainerId, trainerSelection.gender)}
              alt="Текущий тренер"
            />
          </button>
        </div>
      </div>

      <TrainerPickerModal
        isOpen={isTrainerModalOpen}
        activeTrainerId={trainerSelection.trainerId}
        activeTrainerGender={trainerSelection.gender}
        onClose={() => setIsTrainerModalOpen(false)}
        onConfirm={handleTrainerConfirm}
      />

      <div className="home-content">
        {/* Ближайшие дедлайны */}
        {upcomingDeadlines.length > 0 && (
          <div className="home-card">
            <div className="card-title-section">
              <div className="card-icon">⏰</div>
              <h2 className="card-title">{t('nearest_deadlines') ?? 'Nearest deadlines'}</h2>
            </div>
            <div className="deadlines-list">
              {upcomingDeadlines.map((goal, index) => (
                goal.nearestDeadline && (
                  <div 
                    key={goal.id} 
                    className="deadline-card"
                    onClick={() => handleGoalClick(goal.id)}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="deadline-card-content">
                      <div className="deadline-header">
                        <span className="deadline-type-icon">
                          {goal.nearestDeadline.type === 'milestone' ? '🎯' : '📝'}
                        </span>
                        <span className="deadline-title">{goal.title}</span>
                      </div>
                      <div className="deadline-task">{goal.nearestDeadline.title}</div>
                      <div className="deadline-date-badge">
                        {goal.nearestDeadline.formatted}
                      </div>
                    </div>
                    <div className="deadline-arrow">→</div>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Цели */}
        <div className="home-card">
          <div className="card-title-section">
            <div className="card-icon">🎯</div>
            <h2 className="card-title">{t('goals')}</h2>
            {goals.length > 0 && (
              <span className="card-badge">{goals.length}</span>
            )}
          </div>
          <div className="goals-list">
            {goals.length > 0 ? (
              goals.map((goal, index) => (
                <div 
                  key={goal.id} 
                  className="goal-card"
                  onClick={() => handleGoalClick(goal.id)}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="goal-card-header">
                    <h3 className="goal-title">{goal.title}</h3>
                    <div className="goal-progress-percent">{goal.progress}%</div>
                  </div>
                  <div className="goal-progress-wrapper">
                    <div className="goal-progress-bar">
                      <div 
                        className="goal-progress-fill" 
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="goal-stats">
                    {goal.milestoneCount > 0 && (
                      <div className="goal-stat-item">
                        <span className="stat-label">Milestones:</span>
                        <span className="stat-value">{goal.completedMilestones}/{goal.milestoneCount}</span>
                      </div>
                    )}
                    {goal.taskCount > 0 && (
                      <div className="goal-stat-item">
                        <span className="stat-label">Задачи:</span>
                        <span className="stat-value">{goal.completedTasks}/{goal.taskCount}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state-card">
                <div className="empty-icon">🎯</div>
                <p className="empty-title">{t('no_goals_title')}</p>
                <p className="empty-description">{t('no_goals_subtitle')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
