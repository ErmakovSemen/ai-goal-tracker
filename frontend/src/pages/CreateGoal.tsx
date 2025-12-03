import React, { useState, useEffect } from 'react';
import ChatInterface from '../components/ChatInterface';
import { Goal, goalsAPI, milestonesAPI, chatsAPI } from '../services/api';
import './CreateGoal.css';

interface Message {
  id: number;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  actions?: Array<{
    label: string;
    action: string;
    data?: any;
  }>;
}

interface CreateGoalProps {
  onNavigate: (goal?: Goal) => void;
  userId: number;
  debugSettings?: { enabled: boolean; showRawResponse: boolean };
}

const CreateGoal: React.FC<CreateGoalProps> = ({ onNavigate, userId, debugSettings }) => {
  const [goalTitle, setGoalTitle] = useState('');
  const [currentStep, setCurrentStep] = useState<'goal' | 'plan' | 'review'>('goal');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempGoalId, setTempGoalId] = useState<number | null>(null);
  const [chatId, setChatId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      content: "Привет! Я помогу тебе создать цель. Какую цель ты хочешь достичь?",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);

  // Create temporary goal and chat when user defines goal
  const createTempGoalAndChat = async (title: string) => {
    try {
      // Create the goal
      const goal = await goalsAPI.create({ title, description: '' }, userId);
      setTempGoalId(goal.id);
      
      // Create chat for this goal
      const chat = await chatsAPI.create({ goal_id: goal.id });
      setChatId(chat.id);
      
      return { goal, chat };
    } catch (err) {
      console.error('Failed to create goal/chat:', err);
      throw err;
    }
  };

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now(),
      content,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      // Step 1: Define goal
      if (currentStep === 'goal' && content.trim()) {
        setGoalTitle(content.trim());
        
        // Create goal and chat
        const { goal, chat } = await createTempGoalAndChat(content.trim());
        
        // Move to plan step (but AI will ask questions first)
        setCurrentStep('plan');
        
        // Send the goal title to AI so it can ask clarifying questions
        const debugMode = debugSettings?.showRawResponse || false;
        await chatsAPI.sendMessage(chat.id, content.trim(), 'user', debugMode);
        
        // Poll for AI response (it will ask questions)
        let attempts = 0;
        const maxAttempts = 30;
        const pollInterval = 1000;

        const pollForResponse = async () => {
          try {
            const allMessages = await chatsAPI.getMessages(chat.id);
            const aiMessages = allMessages.filter((m: any) => m.sender === 'ai');
            const lastAiMessage = aiMessages[aiMessages.length - 1];
            
            if (lastAiMessage) {
              // New AI response with questions
              const aiResponse: Message = {
                id: lastAiMessage.id,
                content: lastAiMessage.content,
                sender: 'ai',
                timestamp: new Date(lastAiMessage.created_at || Date.now())
              };
              setMessages(prev => [...prev, aiResponse]);
              setLoading(false);
            } else {
              attempts++;
              if (attempts < maxAttempts) {
                setTimeout(pollForResponse, pollInterval);
              } else {
                setLoading(false);
              }
            }
          } catch (err) {
            console.error('Poll error:', err);
            attempts++;
            if (attempts < maxAttempts) {
              setTimeout(pollForResponse, pollInterval);
            } else {
              setLoading(false);
            }
          }
        };

        setTimeout(pollForResponse, 1500);
        return;
      }

      // Step 2+: Use AI for planning
      if (chatId) {
        // Send message to AI
        const debugMode = debugSettings?.showRawResponse || false;
        await chatsAPI.sendMessage(chatId, content, 'user', debugMode);
        
        // Poll for AI response
        let attempts = 0;
        const maxAttempts = 30;
        const pollInterval = 1000;

        const pollForResponse = async () => {
          try {
            const allMessages = await chatsAPI.getMessages(chatId);
            const aiMessages = allMessages.filter((m: any) => m.sender === 'ai');
            const lastAiMessage = aiMessages[aiMessages.length - 1];
            
            // Check if we have a new AI response
            const existingAiIds = messages.filter(m => m.sender === 'ai').map(m => m.id);
            
            if (lastAiMessage && !existingAiIds.includes(lastAiMessage.id)) {
              // New AI response
              const aiResponse: Message = {
                id: lastAiMessage.id,
                content: lastAiMessage.content,
                sender: 'ai',
                timestamp: new Date(lastAiMessage.created_at || Date.now())
              };
              setMessages(prev => [...prev, aiResponse]);
              setLoading(false);
            } else {
              attempts++;
              if (attempts < maxAttempts) {
                setTimeout(pollForResponse, pollInterval);
              } else {
                setLoading(false);
              }
            }
          } catch (err) {
            console.error('Poll error:', err);
            attempts++;
            if (attempts < maxAttempts) {
              setTimeout(pollForResponse, pollInterval);
            } else {
              setLoading(false);
            }
          }
        };

        setTimeout(pollForResponse, 1500);
      } else {
        // No chat yet, show error
        const errorMsg: Message = {
          id: Date.now() + 1,
          content: "Сначала укажи название цели.",
          sender: 'ai',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMsg]);
        setLoading(false);
      }
    } catch (err) {
      console.error('Error:', err);
      const errorMsg: Message = {
        id: Date.now() + 1,
        content: `❌ Ошибка: ${err instanceof Error ? err.message : 'Unknown error'}`,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
      setLoading(false);
    }
  };

  // Reload messages from backend
  const reloadMessages = async () => {
    if (!chatId) return;
    try {
      const allMessages = await chatsAPI.getMessages(chatId);
      const formattedMessages: Message[] = allMessages.map((m: any) => ({
        id: m.id,
        content: m.content,
        sender: m.sender,
        timestamp: new Date(m.created_at || Date.now())
      }));
      // Keep initial greeting and add all from backend
      const initialMsg = messages[0];
      setMessages([initialMsg, ...formattedMessages]);
    } catch (err) {
      console.error('Failed to reload messages:', err);
    }
  };

  const handleConfirmActions = async (actions: any[]) => {
    if (!chatId || !tempGoalId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/chats/${chatId}/confirm-actions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actions)
      });
      
      if (response.ok) {
        // Reload messages to get AI follow-up with suggestions
        await reloadMessages();
        
        // Check if milestones were created and move to review if needed
        const { milestonesAPI } = await import('../services/api');
        const milestones = await milestonesAPI.getByGoalId(tempGoalId);
        if (milestones.length > 0 && currentStep === 'plan') {
          setCurrentStep('review');
        }
      }
    } catch (err) {
      console.error('Confirm error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelActions = async () => {
    if (!chatId) return;
    
    try {
      setLoading(true);
      await fetch(`http://localhost:8000/api/chats/${chatId}/cancel-actions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      // Reload messages to get AI suggestions
      await reloadMessages();
    } catch (err) {
      console.error('Cancel error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    if (tempGoalId) {
      // Navigate to the created goal
      goalsAPI.getById(tempGoalId).then(goal => {
        onNavigate(goal);
      }).catch(() => {
        onNavigate();
      });
    } else {
      onNavigate();
    }
  };

  return (
    <div className="create-goal-chat">
      <div className="create-goal-header">
        <div className="create-goal-header-left">
          <button 
            className="back-button"
            onClick={() => onNavigate()}
            title="Назад"
          >
            ← Назад
          </button>
          <div className="create-goal-header-info">
            <h1>Создание цели</h1>
            <p>Чат с AI для определения цели и плана</p>
          </div>
        </div>
      </div>
      
      <div className="create-goal-progress">
        <div className={`progress-step ${currentStep === 'goal' ? 'active' : 'completed'}`}>
          <span className="step-number">1</span>
          <span className="step-label">Цель</span>
        </div>
        <div className={`progress-step ${currentStep === 'plan' ? 'active' : currentStep === 'review' ? 'completed' : ''}`}>
          <span className="step-number">2</span>
          <span className="step-label">План</span>
        </div>
        <div className={`progress-step ${currentStep === 'review' ? 'active' : ''}`}>
          <span className="step-number">3</span>
          <span className="step-label">Готово</span>
        </div>
      </div>

      {/* Goal info banner */}
      {goalTitle && (
        <div className="goal-info-banner">
          <span className="goal-label">Цель:</span>
          <span className="goal-title">{goalTitle}</span>
          {currentStep === 'review' && (
            <button className="finish-button" onClick={handleFinish}>
              ✅ Завершить и перейти к цели
            </button>
          )}
        </div>
      )}

      <div className="create-goal-chat-container">
        <ChatInterface 
          goalId={tempGoalId || 0}
          chatId={chatId || undefined}
          messages={messages} 
          onSendMessage={handleSendMessage}
          onConfirmActions={handleConfirmActions}
          onCancelActions={handleCancelActions}
          disabled={creating || loading}
          debugMode={debugSettings?.showRawResponse || false}
        />
        {loading && (
          <div className="loading-indicator">
            AI думает...
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
};

export default CreateGoal;
