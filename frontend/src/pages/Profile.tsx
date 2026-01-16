import React, { useState, useEffect } from 'react';
import { authAPI, goalsAPI, milestonesAPI, tasksAPI } from '../services/api';
import { useI18n } from '../i18n';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { ApkInstaller } from '../plugins/apkInstaller';
import { fetchLatestRelease } from '../services/devBuilds';
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
  const { t, locale, setLocale } = useI18n();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(authAPI.isAuthenticated());
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [debugEnabled, setDebugEnabled] = useState<boolean>(() => {
    return localStorage.getItem('debug_mode_enabled') === 'true';
  });
  const [appVersion, setAppVersion] = useState<string>('web');
  const [appBuild, setAppBuild] = useState<string>('N/A');
  const [latestStatus, setLatestStatus] = useState<string | null>(null);
  const [latestError, setLatestError] = useState<string | null>(null);
  const [canInstall, setCanInstall] = useState<boolean | null>(null);
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

  useEffect(() => {
    const loadAppInfo = async () => {
      try {
        if (Capacitor.getPlatform() !== 'web') {
          const info = await CapacitorApp.getInfo();
          setAppVersion(info.version || 'N/A');
          setAppBuild(info.build || 'N/A');
        }
      } catch (err) {
        // ignore
      }
    };
    loadAppInfo();
  }, []);

  const handleToggleDebug = () => {
    const next = !debugEnabled;
    setDebugEnabled(next);
    localStorage.setItem('debug_mode_enabled', String(next));
  };

  const handleUpdateLatest = async () => {
    setLatestError(null);
    setLatestStatus(t('loading'));

    if (Capacitor.getPlatform() !== 'android') {
      setLatestStatus(null);
      setLatestError(t('android_only'));
      return;
    }

    try {
      setLatestStatus(t('fetching_latest'));
      const latest = await fetchLatestRelease();
      if (!latest.apk) {
        throw new Error('APK not found in latest release');
      }

      const installCheck = await ApkInstaller.canInstall();
      setCanInstall(installCheck.canInstall);
      if (!installCheck.canInstall) {
        setLatestStatus(null);
        setLatestError(t('allow_unknown_sources'));
        return;
      }

      setLatestStatus(t('downloading'));
      await ApkInstaller.downloadAndInstall({ url: latest.apk.url, fileName: latest.apk.name });
      setLatestStatus(t('ready_to_install'));
    } catch (err: any) {
      setLatestStatus(null);
      setLatestError(err?.message || t('update_failed'));
    }
  };

  const handleOpenInstallSettings = async () => {
    try {
      await ApkInstaller.openInstallSettings();
    } catch (err) {
      // ignore
    }
  };

  const loadUserData = React.useCallback(async () => {
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
          username: t('profile_guest'),
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
          username: t('profile_guest'),
          email: null,
        });
      } else if (!isRegistered) {
        setUser({
          id: userId || 0,
          username: t('profile_guest'),
          email: null,
        });
      } else {
        authAPI.logout();
        setIsRegistered(false);
        setUser({
          id: userId || 0,
          username: t('profile_guest'),
          email: null,
        });
      }
      setLoading(false);
    }
  }, [isRegistered, t, userId]);

  const loadStats = React.useCallback(async () => {
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
  }, [userId]);

  useEffect(() => {
    loadUserData();
    loadStats();
  }, [loadUserData, loadStats]);

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">{t('loading')}</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-page">
        <div className="profile-error">{t('profile_unavailable')}</div>
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
        <h1>{t('profile_title')}</h1>
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
            <span className="card-title">{t('stats_title')}</span>
          </div>
          <div className={`stats-wrapper ${!isRegistered ? 'stats-locked' : ''}`}>
            <div className="stats-grid">
            <div className="stat-box">
              <div className="stat-icon">🎯</div>
              <div className="stat-value">{stats.totalGoals}</div>
              <div className="stat-label">{t('stats_goals')}</div>
            </div>
            <div className="stat-box">
              <div className="stat-icon">✅</div>
              <div className="stat-value">{stats.completedMilestones}</div>
              <div className="stat-label">{t('stats_milestones')}</div>
            </div>
            <div className="stat-box">
              <div className="stat-icon">📝</div>
              <div className="stat-value">{stats.completedTasks}</div>
              <div className="stat-label">{t('stats_tasks')}</div>
            </div>
            <div className="stat-box streak-box">
              <div className="stat-icon">🔥</div>
              <div className="stat-value">{stats.streak}</div>
              <div className="stat-label">{t('stats_streak')}</div>
            </div>
            </div>
            {!isRegistered && (
              <div className="stats-overlay">
                <div className="stats-overlay-content">
                  <div className="stats-overlay-title">{t('stats_locked')}</div>
                  <button className="register-button" onClick={onRegisterRequest}>
                    {t('register_cta')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Настройки */}
        <div className="profile-card">
          <div className="card-header">
            <span className="card-title">{t('settings_title')}</span>
          </div>
          <div className="settings-list">
            <div className="settings-item">
              <div className="settings-item-content">
                <span className="settings-icon">🌐</span>
                <span className="settings-label">{t('language_label')}</span>
              </div>
              <select
                className="language-select"
                value={locale}
                onChange={(e) => setLocale(e.target.value as 'en' | 'ru')}
              >
                <option value="en">English</option>
                <option value="ru">Русский</option>
              </select>
            </div>
            <div className="settings-item">
              <div className="settings-item-content">
                <span className="settings-icon">🛠️</span>
                <span className="settings-label">{t('debug_title')}</span>
              </div>
              <label className="debug-toggle">
                <input type="checkbox" checked={debugEnabled} onChange={handleToggleDebug} />
                <span className="debug-toggle-slider" />
              </label>
            </div>
            <button className="settings-item">
              <div className="settings-item-content">
                <span className="settings-icon">🔔</span>
                <span className="settings-label">{t('settings_notifications')}</span>
              </div>
              <span className="settings-arrow">›</span>
            </button>
            <button className="settings-item">
              <div className="settings-item-content">
                <span className="settings-icon">🌙</span>
                <span className="settings-label">{t('settings_theme')}</span>
              </div>
              <span className="settings-arrow">›</span>
            </button>
            <button className="settings-item">
              <div className="settings-item-content">
                <span className="settings-icon">🔒</span>
                <span className="settings-label">{t('settings_security')}</span>
              </div>
              <span className="settings-arrow">›</span>
            </button>
          </div>
        </div>

        {debugEnabled && (
          <div className="profile-card">
            <div className="card-header">
              <span className="card-title">{t('debug_title')}</span>
            </div>
            <div className="debug-builds-content">
              <div className="debug-row">
                <span className="debug-label">{t('language_label')}</span>
                <span className="debug-value">{locale}</span>
              </div>
              <div className="debug-row">
                <span className="debug-label">{t('version_label')}</span>
                <span className="debug-value">{appVersion} ({appBuild})</span>
              </div>
              <button className="update-latest-button" onClick={handleUpdateLatest}>
                {t('update_latest')}
              </button>
              {latestStatus && <div className="debug-status">{latestStatus}</div>}
              {latestError && (
                <div className="debug-error">
                  {latestError}
                  {canInstall === false && (
                    <button className="debug-link" onClick={handleOpenInstallSettings}>
                      {t('open_settings')}
                    </button>
                  )}
                </div>
              )}
              <div className="debug-hint">{t('restart_after_install')}</div>
            </div>
          </div>
        )}

        {/* О приложении */}
        <div className="profile-card">
          <div className="card-header">
            <span className="card-title">{t('about_title')}</span>
          </div>
          <div className="about-content">
            <div className="app-name">{t('about_app_name')}</div>
            <div className="app-version">{t('about_version')}</div>
            <p className="app-description">
              {t('about_description')}
            </p>
          </div>
        </div>

        {/* Выход */}
        <button className="logout-button" onClick={onLogout}>
          {t('logout')}
        </button>
      </div>
    </div>
  );
};

export default Profile;
