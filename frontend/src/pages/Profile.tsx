import React, { useState, useEffect } from 'react';
import { authAPI, goalsAPI, milestonesAPI, tasksAPI } from '../services/api';
import './Profile.css';

interface ProfileProps {
  userId: number;
  onLogout: () => void;
}

interface UserData {
  id: number;
  username: string;
  email: string;
}

interface Stats {
  totalGoals: number;
  totalMilestones: number;
  completedMilestones: number;
  totalTasks: number;
  completedTasks: number;
  streak: number;
}

const Profile: React.FC<ProfileProps> = ({ userId, onLogout }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalGoals: 0,
    totalMilestones: 0,
    completedMilestones: 0,
    totalTasks: 0,
    completedTasks: 0,
    streak: 0,
  });

  useEffect(() => {
    loadUserData();
    loadStats();
  }, [userId]);

  const loadUserData = async () => {
    try {
      const userData = await authAPI.getCurrentUser();
      if (userData) {
        setUser({
          id: userData.id,
          username: userData.username,
          email: userData.email || '',
        });
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!userId) return;
    
    try {
      const goals = await goalsAPI.getAll(userId);
      let totalMilestones = 0;
      let completedMilestones = 0;
      let totalTasks = 0;
      let completedTasks = 0;

      for (const goal of goals) {
        try {
          const milestones = await milestonesAPI.getByGoalId(goal.id);
          totalMilestones += milestones.length;
          completedMilestones += milestones.filter(m => m.completed || m.is_completed).length;

          try {
            const tasks = await tasksAPI.getByGoalId(goal.id, false);
            totalTasks += tasks.length;
            completedTasks += tasks.filter(t => t.is_completed).length;
          } catch (err) {
            // Tasks not available
          }
        } catch (err) {
          console.error(`Error loading stats for goal ${goal.id}:`, err);
        }
      }

      // Calculate streak (placeholder)
      const streak = Math.floor(Math.random() * 7) + 1;

      setStats({
        totalGoals: goals.length,
        totalMilestones,
        completedMilestones,
        totalTasks,
        completedTasks,
        streak,
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">Загрузка...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-page">
        <div className="profile-error">Не удалось загрузить данные пользователя</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>Профиль</h1>
      </div>

      <div className="profile-content">
        {/* Аватар и информация */}
        <section className="profile-widget">
          <div className="profile-avatar">
            <div className="avatar-circle">
              {user.username.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="profile-info">
            <h2>{user.username}</h2>
            {user.email && <p className="profile-email">{user.email}</p>}
          </div>
        </section>

        {/* Статистика */}
        <section className="profile-widget">
          <div className="widget-header">
            <span className="widget-title">Статистика</span>
          </div>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{stats.totalGoals}</div>
              <div className="stat-label">Активных целей</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.completedMilestones}</div>
              <div className="stat-label">Выполнено milestones</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.completedTasks}</div>
              <div className="stat-label">Выполнено задач</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.streak}</div>
              <div className="stat-label">Дней подряд</div>
            </div>
          </div>
        </section>

        {/* Настройки */}
        <section className="profile-widget">
          <div className="widget-header">
            <span className="widget-title">Настройки</span>
          </div>
          <div className="settings-list">
            <button className="settings-item">
              <span className="settings-icon">🔔</span>
              <span className="settings-label">Уведомления</span>
              <span className="settings-arrow">›</span>
            </button>
            <button className="settings-item">
              <span className="settings-icon">🌙</span>
              <span className="settings-label">Темная тема</span>
              <span className="settings-arrow">›</span>
            </button>
            <button className="settings-item">
              <span className="settings-icon">🔒</span>
              <span className="settings-label">Безопасность</span>
              <span className="settings-arrow">›</span>
            </button>
          </div>
        </section>

        {/* О приложении */}
        <section className="profile-widget">
          <div className="widget-header">
            <span className="widget-title">О приложении</span>
          </div>
          <div className="about-info">
            <p className="app-name">AI Goal Tracker</p>
            <p className="app-version">Версия 1.0.0</p>
            <p className="app-description">
              Умный помощник для достижения целей с искусственным интеллектом
            </p>
          </div>
        </section>

        {/* Выход */}
        <section className="profile-widget">
          <button className="logout-button" onClick={onLogout}>
            <span className="logout-label">Выйти из аккаунта</span>
          </button>
        </section>
      </div>
    </div>
  );
};

export default Profile;
