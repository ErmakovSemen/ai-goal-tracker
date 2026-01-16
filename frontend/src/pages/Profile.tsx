import React, { useState, useEffect } from 'react';
import { authAPI, goalsAPI, milestonesAPI, tasksAPI } from '../services/api';
import './Profile.css';

interface ProfileProps {
  userId?: number | null;
  onLogout: () => void;
  onRegisterRequest: () => void;
}

interface UserData {
  id: number;
  username: string;
  email?: string | null;
}

interface Stats {
  totalGoals: number;
  totalMilestones: number;
  completedMilestones: number;
  totalTasks: number;
  completedTasks: number;
  streak: number;
}

const Profile: React.FC<ProfileProps> = ({ userId, onLogout, onRegisterRequest }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(authAPI.isAuthenticated());
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
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
          email: userData.email || null,
        });
        setLoading(false);
      } else {
        setErrorDetails('getCurrentUser вернул null');
        // Token is stale or missing — treat as guest
        authAPI.logout();
        setIsRegistered(false);
        setUser({
          id: userId || 0,
          username: 'Гость',
          email: null,
        });
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Failed to load user data:', err);
      const storedUserId = authAPI.getUserId();
      const details = [
        `message: ${err?.message || 'unknown error'}`,
        `isRegistered: ${isRegistered}`,
        `storedUserId: ${storedUserId ?? 'none'}`,
        `propUserId: ${userId ?? 'none'}`
      ].join(' | ');
      setErrorDetails(details);
      // Try to get user from localStorage as fallback
      if (storedUserId) {
        // At least set username from stored data
        setUser({
          id: storedUserId,
          username: 'Пользователь',
          email: null,
        });
      } else if (!isRegistered) {
        setUser({
          id: userId || 0,
          username: 'Гость',
          email: null,
        });
      } else {
        authAPI.logout();
        setIsRegistered(false);
        setUser({
          id: userId || 0,
          username: 'Гость',
          email: null,
        });
      }
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
        <div className="profile-error">Профиль временно недоступен (обновление v2)</div>
        {errorDetails && (
          <div className="profile-debug">
            <div className="profile-debug-title">Debug</div>
            <div className="profile-debug-text">{errorDetails}</div>
          </div>
        )}
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
        <div className="profile-card">
          <div className="profile-avatar-section">
            <div className="avatar-circle">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="profile-info">
              <h2>{user.username}</h2>
              {user.email && <p className="profile-email">{user.email}</p>}
            </div>
          </div>
        </div>

        {/* Статистика */}
        <div className="profile-card">
          <div className="card-header">
            <span className="card-title">Статистика</span>
          </div>
          <div className={`stats-wrapper ${!isRegistered ? 'stats-locked' : ''}`}>
            <div className="stats-grid">
            <div className="stat-box">
              <div className="stat-icon">🎯</div>
              <div className="stat-value">{stats.totalGoals}</div>
              <div className="stat-label">Целей</div>
            </div>
            <div className="stat-box">
              <div className="stat-icon">✅</div>
              <div className="stat-value">{stats.completedMilestones}</div>
              <div className="stat-label">Milestones</div>
            </div>
            <div className="stat-box">
              <div className="stat-icon">📝</div>
              <div className="stat-value">{stats.completedTasks}</div>
              <div className="stat-label">Задач</div>
            </div>
            <div className="stat-box streak-box">
              <div className="stat-icon">🔥</div>
              <div className="stat-value">{stats.streak}</div>
              <div className="stat-label">Дней подряд</div>
            </div>
            </div>
            {!isRegistered && (
              <div className="stats-overlay">
                <div className="stats-overlay-content">
                  <div className="stats-overlay-title">Статистика доступна после регистрации</div>
                  <button className="register-button" onClick={onRegisterRequest}>
                    Зарегистрироваться
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Настройки */}
        <div className="profile-card">
          <div className="card-header">
            <span className="card-title">Настройки</span>
          </div>
          <div className="settings-list">
            <button className="settings-item">
              <div className="settings-item-content">
                <span className="settings-icon">🔔</span>
                <span className="settings-label">Уведомления</span>
              </div>
              <span className="settings-arrow">›</span>
            </button>
            <button className="settings-item">
              <div className="settings-item-content">
                <span className="settings-icon">🌙</span>
                <span className="settings-label">Темная тема</span>
              </div>
              <span className="settings-arrow">›</span>
            </button>
            <button className="settings-item">
              <div className="settings-item-content">
                <span className="settings-icon">🔒</span>
                <span className="settings-label">Безопасность</span>
              </div>
              <span className="settings-arrow">›</span>
            </button>
          </div>
        </div>

        {/* О приложении */}
        <div className="profile-card">
          <div className="card-header">
            <span className="card-title">О приложении</span>
          </div>
          <div className="about-content">
            <div className="app-name">AI Goal Tracker</div>
            <div className="app-version">Версия 1.0.0</div>
            <p className="app-description">
              Умный помощник для достижения целей с искусственным интеллектом
            </p>
          </div>
        </div>

        {/* Выход */}
        <button className="logout-button" onClick={onLogout}>
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
};

export default Profile;
