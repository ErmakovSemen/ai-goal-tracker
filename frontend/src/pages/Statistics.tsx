import React from 'react';
import Mascot from '../components/Mascot';
import './Statistics.css';

interface GoalStats {
  id: number;
  title: string;
  progress: number;
  streak: number;
  lastUpdated: Date;
}

const Statistics: React.FC = () => {
  // Mock data for goals statistics
  const goalsStats: GoalStats[] = [
    {
      id: 1,
      title: "Learn React",
      progress: 75,
      streak: 5,
      lastUpdated: new Date()
    },
    {
      id: 2,
      title: "Fitness Goal",
      progress: 40,
      streak: 4,
      lastUpdated: new Date()
    },
    {
      id: 3,
      title: "Read 12 Books",
      progress: 25,
      streak: 2,
      lastUpdated: new Date()
    }
  ];

  const overallStats = {
    totalGoals: goalsStats.length,
    completedGoals: goalsStats.filter(goal => goal.progress === 100).length,
    currentStreak: Math.max(...goalsStats.map(goal => goal.streak)),
    avgProgress: Math.round(goalsStats.reduce((sum, goal) => sum + goal.progress, 0) / goalsStats.length)
  };

  return (
    <div className="statistics-page">
      <header className="stats-header">
        <h1>Statistics</h1>
        <div className="mascot-container">
          <Mascot mood={overallStats.avgProgress > 50 ? "happy" : "neutral"} size="medium" />
        </div>
      </header>

      <div className="overall-stats">
        <h2>Overall Statistics</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{overallStats.totalGoals}</div>
            <div className="stat-label">Total Goals</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{overallStats.completedGoals}</div>
            <div className="stat-label">Completed Goals</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{overallStats.currentStreak}</div>
            <div className="stat-label">Current Streak</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{overallStats.avgProgress}%</div>
            <div className="stat-label">Average Progress</div>
          </div>
        </div>
      </div>

      <div className="goals-stats">
        <h2>Goals Statistics</h2>
        <div className="goals-table">
          <div className="table-header">
            <div className="table-cell">Goal</div>
            <div className="table-cell">Progress</div>
            <div className="table-cell">Streak</div>
            <div className="table-cell">Last Updated</div>
          </div>
          {goalsStats.map((goal) => (
            <div key={goal.id} className="table-row">
              <div className="table-cell">{goal.title}</div>
              <div className="table-cell">
                <div className="progress-bar-small">
                  <div 
                    className="progress-fill-small" 
                    style={{ width: `${goal.progress}%` }}
                  ></div>
                </div>
                <span>{goal.progress}%</span>
              </div>
              <div className="table-cell">{goal.streak} days</div>
              <div className="table-cell">
                {goal.lastUpdated.toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Statistics;