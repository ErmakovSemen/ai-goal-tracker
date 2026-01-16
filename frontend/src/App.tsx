import React, { useState, useEffect } from 'react';
import './App.css';
import GoalList from './components/GoalList';
import ChatView from './pages/ChatView';
import CreateGoal from './pages/CreateGoal';
import QuickGoalModal from './components/QuickGoalModal';
import DebugMenu, { DebugSettings } from './components/DebugMenu';
import FloatingDebugButton from './components/FloatingDebugButton';
import BottomNavigation, { TabType } from './components/BottomNavigation';
import Home from './pages/Home';
import Profile from './pages/Profile';
import { authAPI, goalsAPI, Goal } from './services/api';
import { useI18n } from './i18n';
import { pushNotificationService } from './services/pushNotifications';

function App() {
  const { t } = useI18n();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
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
  const [activeTab, setActiveTab] = useState<TabType>('home');

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
    if (!isAuth) {
      // Allow guest session if user_id is stored
      const storedUserId = authAPI.getUserId();
      if (storedUserId) {
        setUserId(storedUserId);
        setUsername(t('profile_guest'));
        setIsLoggedIn(true);
      }
    }
  }, [t]);

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
      if (isRegisterMode) {
        // Registration
        if (!email || !email.includes('@')) {
          setError(t('invalid_email'));
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError(t('password_too_short'));
          setLoading(false);
          return;
        }
        
        const result = await authAPI.register(username, email, password);
        if (result.user_id) {
          setUserId(result.user_id);
        }
      setIsLoggedIn(true);
        const user = await authAPI.getCurrentUser();
        if (user) {
          setUsername(user.username);
          setUserId(user.id);
        }
      } else {
        // Login
        const result = await authAPI.login(username, password);
        if (result.user_id) {
          setUserId(result.user_id);
        }
      setIsLoggedIn(true);
        const user = await authAPI.getCurrentUser();
        if (user) {
          setUsername(user.username);
          setUserId(user.id);
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      const errorMessage = err.message || (isRegisterMode ? t('register_failed') : t('login_failed'));
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = React.useCallback(() => {
    authAPI.logout();
    setIsLoggedIn(false);
    setUsername('');
    setEmail('');
    setPassword('');
    setUserId(null);
    setGoals([]);
    setSelectedGoalId(null);
    setIsRegisterMode(false);
  }, []);

  const handleRegisterRequest = () => {
    setIsRegisterMode(true);
    setError(null);
    setPassword('');
    setIsLoggedIn(false);
    setActiveTab('home');
  };

  const handleGoalCreated = async (newGoal?: Goal) => {
    setShowCreateGoal(false);
    if (newGoal) {
      if (!userId || newGoal.user_id !== userId) {
        setUserId(newGoal.user_id);
        authAPI.setUserId(newGoal.user_id);
        if (!isLoggedIn) {
          setIsLoggedIn(true);
        }
        if (!username) {
          setUsername(t('profile_guest'));
        }
      }
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
    try {
      const newGoal = await goalsAPI.create({ title, description }, userId ?? undefined);
      if (!userId || newGoal.user_id !== userId) {
        setUserId(newGoal.user_id);
        authAPI.setUserId(newGoal.user_id);
        if (!isLoggedIn) {
          setIsLoggedIn(true);
        }
        if (!username) {
          setUsername(t('profile_guest'));
        }
      }
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
          <h1>🎯 AI Goal Tracker</h1>
          <p>{t('about_description')}</p>
        </header>
        <main className="login-container">
          <div className="login-form">
            <h2>{isRegisterMode ? t('register_title') : t('login_title')}</h2>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="username">{t('username_label')}</label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('username_label')}
                  required
                  autoComplete="username"
                />
              </div>
              {isRegisterMode && (
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('email_label')}
                    required
                    autoComplete="email"
                  />
                </div>
              )}
              <div className="form-group">
                <label htmlFor="password">{t('password_label')}</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('password_label')}
                  required
                  autoComplete={isRegisterMode ? "new-password" : "current-password"}
                  minLength={isRegisterMode ? 6 : undefined}
                />
              </div>
              <button type="submit" className="login-button" disabled={loading}>
                {loading 
                  ? (isRegisterMode ? t('register_loading') : t('login_loading')) 
                  : (isRegisterMode ? t('register_button') : t('login_button'))
                }
              </button>
            </form>
            {error && (
              <div className="error-message" style={{ 
                color: '#ff4444', 
                marginTop: '10px', 
                padding: '10px',
                background: '#ffe6e6',
                borderRadius: '4px',
                fontSize: '0.9rem'
              }}>
                {error}
              </div>
            )}
            <div style={{ marginTop: '15px', textAlign: 'center' }}>
              <button 
                type="button" 
                onClick={() => {
                  setIsRegisterMode(!isRegisterMode);
                  setError(null);
                  setPassword('');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#667eea',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: '0.9rem'
                }}
              >
                {isRegisterMode ? t('toggle_to_login') : t('toggle_to_register')}
              </button>
            </div>
            <div style={{ marginTop: '10px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(false);
                  setError(null);
                  setPassword('');
                  setUsername('Гость');
                  setIsLoggedIn(true);
                  setActiveTab('chat');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#666',
                  padding: '6px 16px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: '0.9rem'
                }}
              >
                {t('continue_as_guest')}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (showCreateGoal) {
    return (
      <div className="App">
        <CreateGoal 
          onNavigate={(goal?: Goal) => handleGoalCreated(goal)} 
          userId={userId ?? undefined}
          debugSettings={debugSettings}
        />
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return userId ? (
          <Home 
            userId={userId} 
            onGoalClick={(goalId) => {
              setSelectedGoalId(goalId);
              setActiveTab('chat');
            }}
          />
        ) : (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <p>Создайте первую цель, чтобы увидеть статистику.</p>
          </div>
        );
      
      case 'chat':
        return (
          <>
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
          </>
        );
      
      case 'profile':
        return isLoggedIn ? (
          <Profile userId={userId ?? null} onLogout={handleLogout} onRegisterRequest={handleRegisterRequest} />
        ) : (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <p>Войдите, чтобы открыть профиль.</p>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="App app-with-bottom-nav">
      <div className={`main-content ${activeTab === 'chat' ? 'chat-layout' : ''}`}>
        {renderTabContent()}
      </div>
      
      {/* Floating Debug Button */}
      {isLoggedIn && (
        <FloatingDebugButton onClick={() => setShowDebugMenu(true)} />
      )}
      
      {showDebugMenu && (
        <DebugMenu
          settings={debugSettings}
          onSettingsChange={setDebugSettings}
          onClose={() => setShowDebugMenu(false)}
        />
      )}
      
      {/* Bottom Navigation */}
      {isLoggedIn && (
        <BottomNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}
    </div>
  );
}

export default App;