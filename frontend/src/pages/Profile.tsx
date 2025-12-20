import React, { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
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

const Profile: React.FC<ProfileProps> = ({ userId, onLogout }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
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
        {/* Аватар и основная информация */}
        <section className="profile-section">
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

        {/* Настройки */}
        <section className="profile-section">
          <h3>Настройки</h3>
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
        <section className="profile-section">
          <h3>О приложении</h3>
          <div className="about-info">
            <p className="app-name">AI Goal Tracker</p>
            <p className="app-version">Версия 1.0.0</p>
            <p className="app-description">
              Умный помощник для достижения целей с искусственным интеллектом
            </p>
          </div>
        </section>

        {/* Выход */}
        <section className="profile-section">
          <button className="logout-button" onClick={onLogout}>
            <span className="logout-icon">🚪</span>
            <span className="logout-label">Выйти из аккаунта</span>
          </button>
        </section>
      </div>
    </div>
  );
};

export default Profile;

