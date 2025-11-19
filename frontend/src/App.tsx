import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import GoalDetail from './pages/GoalDetail';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/goal/:id" element={<GoalDetail />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;