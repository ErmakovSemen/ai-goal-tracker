import React from 'react';
import { useI18n } from '../i18n';
import './BottomNavigation.css';

export type TabType = 'home' | 'chat' | 'profile';

interface BottomNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onTabChange }) => {
  const { t } = useI18n();
  return (
    <nav className="bottom-navigation">
      <button
        className={`bottom-nav-item ${activeTab === 'home' ? 'active' : ''}`}
        onClick={() => onTabChange('home')}
        aria-label={t('nav_home')}
      >
        <span className="nav-icon">🏠</span>
        <span className="nav-label">{t('nav_home')}</span>
      </button>
      <button
        className={`bottom-nav-item ${activeTab === 'chat' ? 'active' : ''}`}
        onClick={() => onTabChange('chat')}
        aria-label={t('nav_chat')}
      >
        <span className="nav-icon">💬</span>
        <span className="nav-label">{t('nav_chat')}</span>
      </button>
      <button
        className={`bottom-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
        onClick={() => onTabChange('profile')}
        aria-label={t('nav_profile')}
      >
        <span className="nav-icon">👤</span>
        <span className="nav-label">{t('nav_profile')}</span>
      </button>
    </nav>
  );
};

export default BottomNavigation;

