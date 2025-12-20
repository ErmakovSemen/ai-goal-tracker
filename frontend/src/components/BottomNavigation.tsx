import React from 'react';
import './BottomNavigation.css';

export type TabType = 'home' | 'chat' | 'profile';

interface BottomNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="bottom-navigation">
      <button
        className={`bottom-nav-item ${activeTab === 'home' ? 'active' : ''}`}
        onClick={() => onTabChange('home')}
        aria-label="Главная"
      >
        <span className="nav-icon">🏠</span>
        <span className="nav-label">Главная</span>
      </button>
      <button
        className={`bottom-nav-item ${activeTab === 'chat' ? 'active' : ''}`}
        onClick={() => onTabChange('chat')}
        aria-label="Общение"
      >
        <span className="nav-icon">💬</span>
        <span className="nav-label">Общение</span>
      </button>
      <button
        className={`bottom-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
        onClick={() => onTabChange('profile')}
        aria-label="Профиль"
      >
        <span className="nav-icon">👤</span>
        <span className="nav-label">Профиль</span>
      </button>
    </nav>
  );
};

export default BottomNavigation;

