import React, { useState } from 'react';
import ProgressBar from '../components/ProgressBar';
import ChatInterface from '../components/ChatInterface';
import Mascot from '../components/Mascot';
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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      content: "Hello! I'm your AI assistant for this goal. Let's work together to achieve it!",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);

  const goal = {
    id: 1,
    title: "Learn React",
    description: "Master React fundamentals and build a complete application",
    progress: 75,
    milestones: [
      { id: 1, title: "Basic Concepts", completed: true },
      { id: 2, title: "Components", completed: true },
      { id: 3, title: "Hooks", completed: false },
      { id: 4, title: "Advanced Topics", completed: false }
    ] as Milestone[]
  };

  const handleSendMessage = (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: messages.length + 1,
      content,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages([...messages, userMessage]);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: messages.length + 2,
        content: "Thanks for your input! I'll help you with that.",
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    }, 1000);
  };

  return (
    <div className="goal-detail">
      <header className="goal-header">
        <h1>{goal.title}</h1>
        <div className="mascot-container">
          <Mascot mood={goal.progress > 50 ? "happy" : "neutral"} size="small" />
        </div>
      </header>

      <div className="goal-progress-section">
        <h2>Progress</h2>
        <ProgressBar progress={goal.progress} milestones={goal.milestones} />
      </div>

      <div className="goal-content">
        <div className="chat-section">
          <h2>AI Assistant</h2>
          <ChatInterface 
            goalId={goal.id} 
            messages={messages} 
            onSendMessage={handleSendMessage} 
          />
        </div>

        <div className="milestones-section">
          <h2>Milestones</h2>
          <div className="milestones-list">
            {goal.milestones.map((milestone) => (
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
      </div>
    </div>
  );
};

export default GoalDetail;