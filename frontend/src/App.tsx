import React, { useState, useEffect } from 'react';
import './App.css';
import GoalList from './components/GoalList';
import ChatView from './pages/ChatView';
import CreateGoal from './pages/CreateGoal';
import QuickGoalModal from './components/QuickGoalModal';
import DebugMenu, { DebugSettings } from './components/DebugMenu';
import { authAPI, goalsAPI, Goal } from './services/api';
import { pushNotificationService } from './services/pushNotifications';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [showQuickGoalModal, setShowQuickGoalModal] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [debugSettings, setDebugSettings] = useState<DebugSettings>({
    enabled: false,
    showRawResponse: true,
    parseJson: true,
    executeActions: true,
  });
  const [showDebugMenu, setShowDebugMenu] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const isAuth = authAPI.isAuthenticated();
    if (isAuth) {
      // Get user ID from storage or fetch from API
      const storedUserId = authAPI.getUserId();
      if (storedUserId) {
        setUserId(storedUserId);
        setIsLoggedIn(true);
        // Fetch current user to verify and get username
        authAPI.getCurrentUser().then(user => {
          if (user) {
            setUsername(user.username);
            setUserId(user.id);
          }
        }).catch(() => {
          // Token might be invalid, clear auth
          authAPI.logout();
          setIsLoggedIn(false);
        });
      } else {
        // Try to get user from API
        authAPI.getCurrentUser().then(user => {
          if (user) {
            setUsername(user.username);
            setUserId(user.id);
            setIsLoggedIn(true);
          }
        }).catch(() => {
          authAPI.logout();
          setIsLoggedIn(false);
        });
      }
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn && userId) {
      loadGoals();
      // Initialize push notifications
      pushNotificationService.initialize(userId).catch(err => {
        console.warn('Failed to initialize push notifications:', err);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, userId]);

  const loadGoals = async () => {
    if (!userId) return;
    try {
      const fetchedGoals = await goalsAPI.getAll(userId);
      setGoals(fetchedGoals);
      if (fetchedGoals.length > 0 && !selectedGoalId) {
        setSelectedGoalId(fetchedGoals[0].id);
      }
    } catch (err) {
      console.error('Failed to load goals:', err);
      setGoals([]);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      // Try to login with backend
      const result = await authAPI.login(username, password);
      if (result.user_id) {
        setUserId(result.user_id);
      }
      setIsLoggedIn(true);
      // Fetch user info to get username
      const user = await authAPI.getCurrentUser();
      if (user) {
        setUsername(user.username);
        setUserId(user.id);
      }
    } catch (err: any) {
      // If login fails, try to register automatically
      console.log('Login failed, trying auto-registration:', err);
      try {
        // Auto-register with username as email if email not provided
        const email = username.includes('@') ? username : `${username}@example.com`;
        const defaultPassword = password || 'password123'; // In production, require password
        const result = await authAPI.register(username, email, defaultPassword);
        if (result.user_id) {
          setUserId(result.user_id);
        }
        setIsLoggedIn(true);
        const user = await authAPI.getCurrentUser();
        if (user) {
          setUsername(user.username);
          setUserId(user.id);
        }
      } catch (regErr: any) {
        console.error('Auto-registration failed:', regErr);
        setError(regErr.message || 'Не удалось войти или зарегистрироваться');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = React.useCallback(() => {
    authAPI.logout();
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
    setUserId(null);
    setGoals([]);
    setSelectedGoalId(null);
  }, []);

  const handleGoalCreated = async (newGoal?: Goal) => {
    setShowCreateGoal(false);
    if (newGoal) {
      // Add new goal to the list immediately
      setGoals([...goals, newGoal]);
      setSelectedGoalId(newGoal.id);
    } else {
      // Reload from API
      await loadGoals();
    }
  };

  const handleGoalCreatedFromChat = (newGoal: Goal) => {
    console.log('handleGoalCreatedFromChat called with:', newGoal);
    // Add new goal to the list and switch to it
    setGoals(prevGoals => {
      // Check if goal already exists
      if (prevGoals.some(g => g.id === newGoal.id)) {
        console.log('Goal already exists, just switching to it');
        return prevGoals;
      }
      console.log('Adding new goal to list');
      return [...prevGoals, newGoal];
    });
    console.log('Setting selected goal id to:', newGoal.id);
    setSelectedGoalId(newGoal.id);
  };

  const handleQuickGoalCreate = async (title: string, description?: string) => {
    if (!userId) {
      throw new Error('User not authenticated');
    }
    try {
      const newGoal = await goalsAPI.create({ title, description }, userId);
      setGoals([...goals, newGoal]);
      setSelectedGoalId(newGoal.id);
      setShowQuickGoalModal(false);
    } catch (err) {
      console.error('Failed to create goal:', err);
      throw err;
    }
  };

  const handleDeleteGoal = async (goalId: number) => {
    try {
      await goalsAPI.delete(goalId);
      // Remove from local state
      const updatedGoals = goals.filter(g => g.id !== goalId);
      setGoals(updatedGoals);
      
      // If deleted goal was selected, select another or clear selection
      if (selectedGoalId === goalId) {
        if (updatedGoals.length > 0) {
          setSelectedGoalId(updatedGoals[0].id);
        } else {
          setSelectedGoalId(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete goal:', err);
      alert('Не удалось удалить цель. Попробуйте ещё раз.');
    }
  };

  const selectedGoal = goals.find(g => g.id === selectedGoalId) || null;

  if (!isLoggedIn) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>AI Goal Tracker</h1>
          <p>AI-powered goal tracking application</p>
        </header>
        <main className="login-container">
          <div className="login-form">
            <h2>Welcome</h2>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
              <button type="submit" className="login-button" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
            {error && (
              <div className="error-message" style={{ color: 'red', marginTop: '10px' }}>
                {error}
              </div>
            )}
            <div style={{ marginTop: '15px', textAlign: 'center' }}>
              <button 
                type="button" 
                onClick={() => {
                  setIsLoggedIn(true);
                  setUsername('Guest User');
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid #ccc',
                  color: '#666',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Continue as Guest (Demo Mode)
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (showCreateGoal) {
    if (!userId) {
      return (
        <div className="App">
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <p>Пожалуйста, войдите в систему</p>
            <button onClick={() => setShowCreateGoal(false)}>Назад</button>
          </div>
        </div>
      );
    }
    return (
      <div className="App">
        <CreateGoal 
          onNavigate={(goal?: Goal) => handleGoalCreated(goal)} 
          userId={userId}
          debugSettings={debugSettings}
        />
      </div>
    );
  }

  return (
    <div className="App chat-layout">
      <GoalList
        goals={goals.map(g => ({
          ...g,
          progress: 0,
          lastMessage: "Click to start chatting",
          lastMessageTime: "Just now"
        }))}
        selectedGoalId={selectedGoalId}
        onSelectGoal={setSelectedGoalId}
        onCreateNew={() => setShowQuickGoalModal(true)}
        onDeleteGoal={handleDeleteGoal}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <QuickGoalModal
        isOpen={showQuickGoalModal}
        onClose={() => setShowQuickGoalModal(false)}
        onCreateGoal={handleQuickGoalCreate}
        onOpenFullEditor={() => {
          setShowQuickGoalModal(false);
          setShowCreateGoal(true);
        }}
      />
      <ChatView
        goal={selectedGoal}
        onBack={() => setSelectedGoalId(null)}
        onDeleteGoal={handleDeleteGoal}
        onGoalCreated={handleGoalCreatedFromChat}
        debugSettings={debugSettings}
      />
      <div className="debug-toggle-container">
        <button 
          className={`debug-toggle ${debugSettings.enabled ? 'active' : ''}`}
          onClick={() => setShowDebugMenu(true)}
          title="Open debug settings"
        >
          🐛 Debug
        </button>
        <button 
          className="debug-toggle"
          onClick={handleLogout}
          title="Logout"
        >
          🚪 Выход
        </button>
      </div>
      {showDebugMenu && (
        <DebugMenu
          settings={debugSettings}
          onSettingsChange={setDebugSettings}
          onClose={() => setShowDebugMenu(false)}
        />
      )}
    </div>
  );
}

export default App;