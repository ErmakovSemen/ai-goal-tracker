import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatInterface from '../components/ChatInterface';
import Mascot from '../components/Mascot';
import './CreateGoal.css';

interface Message {
  id: number;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const CreateGoal: React.FC = () => {
  const navigate = useNavigate();
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      content: "Hi! I'm your AI assistant for goal creation. What would you like to achieve?",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);

  const handleSendMessage = (content: string) => {
    const userMessage: Message = {
      id: messages.length + 1,
      content,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages([...messages, userMessage]);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: messages.length + 2,
        content: "Thanks for sharing! Let me help you formalize this goal. Can you tell me more about what success looks like for this goal?",
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const handleCreateGoal = () => {
    if (goalTitle.trim()) {
      // Here you would typically send the goal data to your backend
      console.log("Creating goal:", { title: goalTitle, description: goalDescription });
      alert("Goal created successfully!");
      navigate('/');
    }
  };

  return (
    <div className="create-goal">
      <header className="create-goal-header">
        <h1>Create New Goal</h1>
        <div className="mascot-container">
          <Mascot mood="excited" size="small" />
        </div>
      </header>

      <div className="goal-form">
        <div className="form-group">
          <label htmlFor="goal-title">Goal Title</label>
          <input
            id="goal-title"
            type="text"
            value={goalTitle}
            onChange={(e) => setGoalTitle(e.target.value)}
            placeholder="What do you want to achieve?"
          />
        </div>

        <div className="form-group">
          <label htmlFor="goal-description">Description</label>
          <textarea
            id="goal-description"
            value={goalDescription}
            onChange={(e) => setGoalDescription(e.target.value)}
            placeholder="Describe your goal in more detail..."
            rows={4}
          />
        </div>
      </div>

      <div className="ai-assistant-section">
        <h2>AI Assistant</h2>
        <p>Chat with our AI to help formalize your goal and create a plan</p>
        <ChatInterface 
          goalId={0} 
          messages={messages} 
          onSendMessage={handleSendMessage} 
        />
      </div>

      <div className="form-actions">
        <button 
          className="create-button" 
          onClick={handleCreateGoal}
          disabled={!goalTitle.trim()}
        >
          Create Goal
        </button>
        <button 
          className="cancel-button" 
          onClick={() => navigate('/')}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default CreateGoal;