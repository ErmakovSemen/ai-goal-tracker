import React from 'react';
import GoalCard from '../components/GoalCard';
import './Dashboard.css';

interface Goal {
  id: number;
  title: string;
  progress: number;
  milestones: { id: number; title: string; completed: boolean }[];
}

const Dashboard: React.FC = () => {
  // Mock data for goals
  const goals: Goal[] = [
    {
      id: 1,
      title: "Learn React",
      progress: 75,
      milestones: [
        { id: 1, title: "Basic Concepts", completed: true },
        { id: 2, title: "Components", completed: true },
        { id: 3, title: "Hooks", completed: false },
        { id: 4, title: "Advanced Topics", completed: false }
      ]
    },
    {
      id: 2,
      title: "Fitness Goal",
      progress: 40,
      milestones: [
        { id: 1, title: "Week 1", completed: true },
        { id: 2, title: "Week 2", completed: false },
        { id: 3, title: "Week 3", completed: false },
        { id: 4, title: "Final Week", completed: false }
      ]
    }
  ];

  const handleGoalClick = (id: number) => {
    console.log(`Navigate to goal ${id}`);
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>AI Goal Tracker</h1>
        <button className="add-goal-button">Add New Goal</button>
      </header>
      <div className="goals-container">
        <h2>Your Goals</h2>
        {goals.map((goal) => (
          <GoalCard
            key={goal.id}
            id={goal.id}
            title={goal.title}
            progress={goal.progress}
            milestones={goal.milestones}
            onGoalClick={handleGoalClick}
          />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;