import React, { useState, useEffect } from 'react';
import { goalsAPI, milestonesAPI, tasksAPI } from '../services/api';
import './Home.css';

interface HomeProps {
  userId: number;
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

const Home: React.FC<HomeProps> = ({ userId }) => {
  const [goals, setGoals] = useState<GoalStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStreak, setTotalStreak] = useState(0);
  const [todayCompletion, setTodayCompletion] = useState(0);

  useEffect(() => {
    loadData();
    // Обновляем данные каждые 30 секунд
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
            // Загружаем milestones
            const milestones = await milestonesAPI.getByGoalId(goal.id);
            const completedMilestones = milestones.filter(m => m.completed || m.is_completed).length;
            const progress = milestones.length > 0 
              ? Math.round((completedMilestones / milestones.length) * 100) 
              : 0;

            // Загружаем tasks
            let tasks: any[] = [];
            try {
              tasks = await tasksAPI.getByGoalId(goal.id, false);
            } catch (err) {
              console.log('Tasks not available yet');
            }
            const completedTasks = tasks.filter(t => t.is_completed).length;

            // Загружаем ближайший дедлайн
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
              completedTasks,
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
      
      // Вычисляем стрик (пока заглушка, нужно будет добавить API)
      const calculatedStreak = calculateStreak(goalsWithStats);
      setTotalStreak(calculatedStreak);
      
      // Вычисляем выполнение за сегодня
      const todayTasks = goalsWithStats.reduce((sum, g) => sum + g.completedTasks, 0);
      setTodayCompletion(todayTasks);
    } catch (err) {
      console.error('Failed to load home data:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStreak = (goals: GoalStats[]): number => {
    // Заглушка для стрика - в реальности нужно проверять активность за последние дни
    return Math.floor(Math.random() * 7) + 1;
  };

  const upcomingDeadlines = goals
    .filter(g => g.nearestDeadline)
    .sort((a, b) => {
      if (!a.nearestDeadline || !b.nearestDeadline) return 0;
      return new Date(a.nearestDeadline.deadline).getTime() - new Date(b.nearestDeadline.deadline).getTime();
    })
    .slice(0, 5);

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
        {/* Статистика */}
        <section className="home-section">
          <h2>📊 Статистика</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{goals.length}</div>
              <div className="stat-label">Активных целей</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{totalStreak}</div>
              <div className="stat-label">Дней подряд</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{todayCompletion}</div>
              <div className="stat-label">Задач сегодня</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {goals.reduce((sum, g) => sum + g.completedMilestones, 0)}
              </div>
              <div className="stat-label">Выполнено milestones</div>
            </div>
          </div>
        </section>

        {/* Стрик */}
        <section className="home-section">
          <h2>🔥 Стрик</h2>
          <div className="streak-widget">
            <div className="streak-value">{totalStreak}</div>
            <div className="streak-label">дней подряд!</div>
            <div className="streak-emoji">🔥</div>
          </div>
        </section>

        {/* Ближайшие дедлайны */}
        <section className="home-section">
          <h2>⏰ Ближайшие дедлайны</h2>
          {upcomingDeadlines.length > 0 ? (
            <div className="deadlines-list">
              {upcomingDeadlines.map((goal) => (
                goal.nearestDeadline && (
                  <div key={goal.id} className="deadline-item">
                    <div className="deadline-goal">{goal.title}</div>
                    <div className="deadline-info">
                      <span className="deadline-title">{goal.nearestDeadline.title}</span>
                      <span className="deadline-date">{goal.nearestDeadline.formatted}</span>
                      <span className="deadline-type">
                        {goal.nearestDeadline.type === 'milestone' ? '🎯' : '📝'}
                      </span>
                    </div>
                  </div>
                )
              ))}
            </div>
          ) : (
            <div className="empty-state">Нет ближайших дедлайнов</div>
          )}
        </section>

        {/* Виджеты целей */}
        <section className="home-section">
          <h2>🎯 Все цели</h2>
          {goals.length > 0 ? (
            <div className="goals-widget-list">
              {goals.map((goal) => (
                <div key={goal.id} className="goal-widget">
                  <div className="goal-widget-header">
                    <h3>{goal.title}</h3>
                    <span className="goal-progress-badge">{goal.progress}%</span>
                  </div>
                  <div className="goal-widget-progress">
                    <div 
                      className="goal-widget-progress-bar" 
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                  <div className="goal-widget-stats">
                    <span>{goal.completedMilestones}/{goal.milestoneCount} milestones</span>
                    {goal.taskCount > 0 && (
                      <span>{goal.completedTasks}/{goal.taskCount} задач</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">У вас пока нет целей. Создайте первую!</div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Home;

