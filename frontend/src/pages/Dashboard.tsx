import React, { useState, useEffect } from 'react';
import GoalCard from '../components/GoalCard';
import { goalsAPI, milestonesAPI, Goal, Milestone } from '../services/api';
import './Dashboard.css';

interface GoalWithMilestones extends Goal {
  progress: number;
  milestones: { id: number; title: string; completed: boolean }[];
}

interface DashboardProps {
  onNavigate: (page: string) => void;
  onGoalClick: (id: number) => void;
  userId: number;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onGoalClick, userId }) => {
  const [goals, setGoals] = useState<GoalWithMilestones[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGoals();
  }, [userId]);

  const loadGoals = async () => {
    try {
      setLoading(true);
      try {
        const fetchedGoals = await goalsAPI.getAll(userId);
      
      // Load milestones for each goal
      const goalsWithMilestones = await Promise.all(
        fetchedGoals.map(async (goal) => {
          try {
            const milestones = await milestonesAPI.getByGoalId(goal.id);
            const completedCount = milestones.filter(m => m.completed).length;
            const progress = milestones.length > 0 
              ? Math.round((completedCount / milestones.length) * 100) 
              : 0;
            
            return {
              ...goal,
              progress,
              milestones: milestones.map(m => ({
                id: m.id,
                title: m.title || '',
                completed: m.completed || m.is_completed || false,
              })),
            };
          } catch (err) {
            return {
              ...goal,
              progress: 0,
              milestones: [],
            };
          }
        })
      );
      
        setGoals(goalsWithMilestones);
      } catch (apiErr) {
        // If API fails, use empty goals list (demo mode)
        console.log('API unavailable, using demo mode:', apiErr);
        setGoals([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div style={{ textAlign: 'center', padding: '20px' }}>Loading goals...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div style={{ color: 'red', padding: '20px' }}>Error: {error}</div>
        <button onClick={loadGoals}>Retry</button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>AI Goal Tracker</h1>
        <button className="add-goal-button" onClick={() => onNavigate('create-goal')}>
          Add New Goal
        </button>
      </header>
      <div className="goals-container">
        <h2>Your Goals</h2>
        {goals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p>No goals yet. Create your first goal!</p>
            <button onClick={() => onNavigate('create-goal')}>Create Goal</button>
          </div>
        ) : (
          goals.map((goal) => (
          <GoalCard
            key={goal.id}
            id={goal.id}
            title={goal.title}
            progress={goal.progress}
            milestones={goal.milestones}
            onGoalClick={onGoalClick}
          />
          ))
        )}
      </div>
    </div>
  );
};

export default Dashboard;