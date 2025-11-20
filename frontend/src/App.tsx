import React, { useState } from 'react';
import './App.css';
import Dashboard from './pages/Dashboard';
import CreateGoal from './pages/CreateGoal';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [currentPage, setCurrentPage] = useState('dashboard'); // 'dashboard', 'create-goal'

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock authentication - in a real app, this would call an API
    if (username && password) {
      setIsLoggedIn(true);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
    setCurrentPage('dashboard');
  };

  const handleNavigation = (page: string) => {
    setCurrentPage(page);
  };

  const handleGoalClick = (id: number) => {
    console.log(`Navigate to goal ${id}`);
    // In a real app, this would navigate to the goal detail page
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'create-goal':
        return <CreateGoal onNavigate={handleNavigation} />;
      case 'dashboard':
      default:
        return <Dashboard onNavigate={handleNavigation} onGoalClick={handleGoalClick} />;
    }
  };

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
              <button type="submit" className="login-button">
                Login
              </button>
            </form>
            <div className="mock-login-info">
              <p><strong>Mock Login:</strong> Enter any username and password to login</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>AI Goal Tracker</h1>
        <div className="user-controls">
          <span>Welcome, {username}!</span>
          <button onClick={() => handleNavigation('create-goal')} className="nav-button">
            Create Goal
          </button>
          <button onClick={() => handleNavigation('dashboard')} className="nav-button">
            Dashboard
          </button>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>
      <main className="app-main">
        {renderCurrentPage()}
      </main>
    </div>
  );
}

export default App;