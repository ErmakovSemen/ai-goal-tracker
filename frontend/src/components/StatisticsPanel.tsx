import React from 'react';
import Mascot from './Mascot';
import './StatisticsPanel.css';

interface StatisticItem {
  id: number;
  title: string;
  value: string | number;
  change?: number;
}

interface StatisticsPanelProps {
  goalId: number;
  streak: number;
  completionRate: number;
  totalTime: number;
}

const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ goalId, streak, completionRate, totalTime }) => {
  const statistics: StatisticItem[] = [
    { id: 1, title: "Current Streak", value: `${streak} days` },
    { id: 2, title: "Completion Rate", value: `${completionRate}%` },
    { id: 3, title: "Total Time", value: `${totalTime} hours` }
  ];

  const getMood = () => {
    if (completionRate >= 80) return "happy";
    if (completionRate >= 50) return "neutral";
    return "sad";
  };

  return (
    <div className="statistics-panel">
      <div className="stats-header">
        <h3>Statistics</h3>
        <div className="mascot-stats">
          <Mascot mood={getMood()} size="small" />
        </div>
      </div>
      
      <div className="stats-grid">
        {statistics.map((stat) => (
          <div key={stat.id} className="stat-card">
            <div className="stat-title">{stat.title}</div>
            <div className="stat-value">{stat.value}</div>
          </div>
        ))}
      </div>
      
      <div className="chart-placeholder">
        <p>Progress Chart</p>
        <div className="chart-container">
          <div className="chart-bar" style={{ height: '70%' }}></div>
          <div className="chart-bar" style={{ height: '40%' }}></div>
          <div className="chart-bar" style={{ height: '60%' }}></div>
          <div className="chart-bar" style={{ height: '80%' }}></div>
          <div className="chart-bar" style={{ height: '50%' }}></div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsPanel;