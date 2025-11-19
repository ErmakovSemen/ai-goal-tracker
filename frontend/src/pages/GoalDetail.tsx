import React, { useState } from 'react';
import ProgressBar from '../components/ProgressBar';
import ChatInterface from '../components/ChatInterface';
import Mascot from '../components/Mascot';
import ReportForm from '../components/ReportForm';
import StatisticsPanel from '../components/StatisticsPanel';
import './GoalDetail.css';

interface Message {
  id: number;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface Milestone {
  id: number;
  title: string;
  completed: boolean;
}

const GoalDetail: React.FC = () => {
  // Mock data
  const goalTitle = "Learn React";
  const progress = 75;
  const streak = 5;
  const completionRate = 75;
  const totalTime = 24;
  
  const milestones: Milestone[] = [
    { id: 1, title: "Basic Concepts", completed: true },
    { id: 2, title: "Components", completed: true },
    { id: 3, title: "Hooks", completed: false },
    { id: 4, title: "Advanced Topics", completed: false }
  ];
  
  const initialMessages: Message[] = [
    { id: 1, content: "Hello! I'm your AI assistant for this goal. How can I help you today?", sender: 'ai', timestamp: new Date() },
    { id: 2, content: "Can you help me understand React hooks better?", sender: 'user', timestamp: new Date() },
    { id: 3, content: "Of course! React hooks are functions that let you 'hook into' React state and lifecycle features from function components.", sender: 'ai', timestamp: new Date() }
  ];
  
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  
  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: messages.length + 1,
      content,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages([...messages, newMessage]);
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: messages.length + 2,
        content: "Thanks for your message! This is a simulated response from the AI assistant.",
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };
  
  const handleReportSubmit = (content: string) => {
    console.log("Report submitted:", content);
    // Here you would typically send the report to your backend
    alert("Report submitted successfully!");
  };
  
  return (
    <div className="goal-detail">
      <header className="goal-header">
        <h1>{goalTitle}</h1>
        <div className="mascot-container">
          <Mascot mood={progress > 50 ? "happy" : "sad"} size="small" />
        </div>
      </header>
      
      <div className="goal-progress-section">
        <h2>Progress</h2>
        <ProgressBar progress={progress} milestones={milestones} />
      </div>
      
      <div className="goal-content">
        <div className="main-content">
          <div className="chat-section">
            <h2>Chat with AI Assistant</h2>
            <ChatInterface 
              goalId={1} 
              messages={messages} 
              onSendMessage={handleSendMessage} 
            />
          </div>
          
          <StatisticsPanel 
            goalId={1} 
            streak={streak} 
            completionRate={completionRate} 
            totalTime={totalTime} 
          />
        </div>
        
        <div className="sidebar">
          <div className="milestones-section">
            <h2>Milestones</h2>
            <div className="milestones-list">
              {milestones.map((milestone) => (
                <div 
                  key={milestone.id} 
                  className={`milestone-item ${milestone.completed ? 'completed' : ''}`}
                >
                  <input 
                    type="checkbox" 
                    checked={milestone.completed} 
                    onChange={() => {}} 
                  />
                  <span className="milestone-title">{milestone.title}</span>
                </div>
              ))}
            </div>
          </div>
          
          <ReportForm goalId={1} onSubmit={handleReportSubmit} />
        </div>
      </div>
    </div>
  );
};

export default GoalDetail;