import React, { useState } from 'react';
import ChatInterface from '../components/ChatInterface';
import { Goal, goalsAPI, milestonesAPI, chatsAPI } from '../services/api';
import './CreateGoal.css';

interface Message {
  id: number;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface CreateGoalProps {
  onNavigate: (goal?: Goal) => void;
  userId: number;
  debugSettings?: { enabled: boolean; showRawResponse: boolean };
}

const CreateGoal: React.FC<CreateGoalProps> = ({ onNavigate, userId, debugSettings }) => {
  const [mode, setMode] = useState<'ai' | 'manual'>('ai'); // AI или ручной режим
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [milestones, setMilestones] = useState<Array<{ title: string; description?: string; target_date?: string }>>([]);
  const [currentStep, setCurrentStep] = useState<'goal' | 'plan' | 'review'>('goal');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempGoalId, setTempGoalId] = useState<number | null>(null);
  const [chatId, setChatId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingMilestoneIndex, setEditingMilestoneIndex] = useState<number | null>(null);
  const [newMilestone, setNewMilestone] = useState({ title: '', description: '', target_date: '' });

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      content: "Привет! 👋 Давай создадим цель вместе!\n\nРасскажи, чего ты хочешь достичь? Не стесняйся — можешь описать своими словами, а я помогу сформулировать и составить план.",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);

  // Create temporary goal and chat
  const createTempGoalAndChat = async (title: string, description?: string) => {
    try {
      const goal = await goalsAPI.create({ title, description }, userId);
      setTempGoalId(goal.id);
      const chat = await chatsAPI.create({ goal_id: goal.id });
      setChatId(chat.id);
      return { goal, chat };
    } catch (err) {
      console.error('Failed to create goal/chat:', err);
      throw err;
    }
  };

  // Handle AI chat messages
  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now(),
      content,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      if (currentStep === 'goal' && content.trim() && !goalTitle) {
        setGoalTitle(content.trim());
        const { chat } = await createTempGoalAndChat(content.trim());
        setCurrentStep('plan');
        const debugMode = debugSettings?.showRawResponse || false;
        await chatsAPI.sendMessage(chat.id, content.trim(), 'user', debugMode);
        
        let attempts = 0;
        const maxAttempts = 30;
        const pollForResponse = async () => {
          try {
            const allMessages = await chatsAPI.getMessages(chat.id);
            const aiMessages = allMessages.filter((m: any) => m.sender === 'ai');
            const lastAiMessage = aiMessages[aiMessages.length - 1];
            
            if (lastAiMessage) {
              const aiResponse: Message = {
                id: lastAiMessage.id,
                content: lastAiMessage.content,
                sender: 'ai',
                timestamp: new Date(lastAiMessage.created_at || Date.now())
              };
              setMessages(prev => [...prev, aiResponse]);
              
              // Check if AI created a new goal and navigate to it
              const goalMatch = lastAiMessage.content.match(/Создана новая цель[^:]*:\s*([^(]+)\s*\(ID:\s*(\d+)\)/);
              if (goalMatch) {
                const goalId = parseInt(goalMatch[2], 10);
                if (goalId && !isNaN(goalId)) {
                  try {
                    const newGoal = await goalsAPI.getById(goalId);
                    console.log('New goal created, navigating:', newGoal);
                    onNavigate(newGoal);
                    return;
                  } catch (err) {
                    console.error('Failed to load new goal:', err);
                  }
                }
              }
              
              setLoading(false);
            } else {
              attempts++;
              if (attempts < maxAttempts) {
                setTimeout(pollForResponse, 1000);
              } else {
                setLoading(false);
              }
            }
          } catch (err) {
            console.error('Poll error:', err);
            attempts++;
            if (attempts < maxAttempts) {
              setTimeout(pollForResponse, 1000);
            } else {
              setLoading(false);
            }
          }
        };
        setTimeout(pollForResponse, 1500);
        return;
      }

      if (chatId) {
        const debugMode = debugSettings?.showRawResponse || false;
        await chatsAPI.sendMessage(chatId, content, 'user', debugMode);
        
        let attempts = 0;
        const maxAttempts = 30;
        const pollForResponse = async () => {
          try {
            const allMessages = await chatsAPI.getMessages(chatId);
            const aiMessages = allMessages.filter((m: any) => m.sender === 'ai');
            const lastAiMessage = aiMessages[aiMessages.length - 1];
            const existingAiIds = messages.filter(m => m.sender === 'ai').map(m => m.id);
            
            if (lastAiMessage && !existingAiIds.includes(lastAiMessage.id)) {
              const aiResponse: Message = {
                id: lastAiMessage.id,
                content: lastAiMessage.content,
                sender: 'ai',
                timestamp: new Date(lastAiMessage.created_at || Date.now())
              };
              setMessages(prev => [...prev, aiResponse]);
              
              // Check if AI created a new goal and navigate to it
              const goalMatch = lastAiMessage.content.match(/Создана новая цель[^:]*:\s*([^(]+)\s*\(ID:\s*(\d+)\)/);
              if (goalMatch) {
                const goalId = parseInt(goalMatch[2], 10);
                if (goalId && !isNaN(goalId)) {
                  try {
                    const newGoal = await goalsAPI.getById(goalId);
                    console.log('New goal created, navigating:', newGoal);
                    onNavigate(newGoal);
                    return;
                  } catch (err) {
                    console.error('Failed to load new goal:', err);
                  }
                }
              }
              
              setLoading(false);
            } else {
              attempts++;
              if (attempts < maxAttempts) {
                setTimeout(pollForResponse, 1000);
              } else {
                setLoading(false);
              }
            }
          } catch (err) {
            console.error('Poll error:', err);
            attempts++;
            if (attempts < maxAttempts) {
              setTimeout(pollForResponse, 1000);
            } else {
              setLoading(false);
            }
          }
        };
        setTimeout(pollForResponse, 1500);
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

  // Handle AI actions (milestone creation)
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
        // Reload milestones from backend
        const backendMilestones = await milestonesAPI.getByGoalId(tempGoalId);
        setMilestones(backendMilestones.map((m: any) => ({
          title: m.title,
          description: m.description,
          target_date: m.target_date || undefined
        })));
        await reloadMessages();
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
      await reloadMessages();
    } catch (err) {
      console.error('Cancel error:', err);
    } finally {
      setLoading(false);
    }
  };

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
      const initialMsg = messages[0];
      setMessages([initialMsg, ...formattedMessages]);
    } catch (err) {
      console.error('Failed to reload messages:', err);
    }
  };

  // Manual milestone management
  const handleAddMilestone = () => {
    if (!newMilestone.title.trim()) return;
    setMilestones([...milestones, { ...newMilestone, target_date: newMilestone.target_date || undefined }]);
    setNewMilestone({ title: '', description: '', target_date: '' });
  };

  const handleEditMilestone = (index: number) => {
    setEditingMilestoneIndex(index);
    const milestone = milestones[index];
    setNewMilestone({ 
      title: milestone.title, 
      description: milestone.description || '', 
      target_date: milestone.target_date || '' 
    });
  };

  const handleSaveMilestone = () => {
    if (editingMilestoneIndex !== null && newMilestone.title.trim()) {
      const updated = [...milestones];
      updated[editingMilestoneIndex] = { ...newMilestone, target_date: newMilestone.target_date || undefined };
      setMilestones(updated);
      setEditingMilestoneIndex(null);
      setNewMilestone({ title: '', description: '', target_date: '' });
    }
  };

  const handleDeleteMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  // Create goal with milestones
  const handleCreateGoal = async () => {
    if (!goalTitle.trim()) {
      setError('Введите название цели');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      let goal: Goal;
      
      if (tempGoalId) {
        // Update existing goal
        goal = await goalsAPI.update(tempGoalId, {
          title: goalTitle,
          description: goalDescription || undefined
        });
      } else {
        // Create new goal
        goal = await goalsAPI.create({
          title: goalTitle,
          description: goalDescription || undefined
        }, userId);
      }

      // Create milestones
      for (const milestone of milestones) {
        await milestonesAPI.create({
          title: milestone.title,
          description: milestone.description,
          goal_id: goal.id,
          target_date: milestone.target_date || undefined
        });
      }

      onNavigate(goal);
    } catch (err) {
      console.error('Error creating goal:', err);
      setError(err instanceof Error ? err.message : 'Failed to create goal');
      setCreating(false);
    }
  };

  return (
    <div className="create-goal-chat">
      <div className="create-goal-header">
        <div className="create-goal-header-left">
          <button className="back-button" onClick={() => onNavigate()} title="Назад">
            ← Назад
          </button>
          <div className="create-goal-header-info">
            <h1>Создание цели</h1>
            <p>Выберите режим: AI или ручной ввод</p>
          </div>
        </div>
      </div>

      {/* Mode switcher */}
      <div className="mode-switcher">
        <button
          className={`mode-btn ${mode === 'ai' ? 'active' : ''}`}
          onClick={() => setMode('ai')}
        >
          🤖 С AI
        </button>
        <button
          className={`mode-btn ${mode === 'manual' ? 'active' : ''}`}
          onClick={() => setMode('manual')}
        >
          ✏️ Ручной ввод
        </button>
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

      {mode === 'ai' ? (
        // AI Mode
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
            <div className="loading-indicator">AI думает...</div>
          )}
        </div>
      ) : (
        // Manual Mode
        <div className="manual-goal-form">
          <div className="form-section">
            <label>Название цели *</label>
            <input
              type="text"
              value={goalTitle}
              onChange={(e) => {
                setGoalTitle(e.target.value);
                if (e.target.value.trim() && currentStep === 'goal') {
                  setCurrentStep('plan');
                }
              }}
              placeholder="Например: Выучить испанский"
            />
          </div>

          <div className="form-section">
            <label>Описание</label>
            <textarea
              value={goalDescription}
              onChange={(e) => setGoalDescription(e.target.value)}
              placeholder="Подробности о цели..."
              rows={3}
            />
          </div>

          {currentStep !== 'goal' && (
            <div className="milestones-section">
              <h3>Подцели (майлстоуны)</h3>
              
              {/* Milestones list */}
              <div className="milestones-list">
                {milestones.map((milestone, index) => (
                  <div key={index} className="milestone-item">
                    <div className="milestone-info">
                      <strong>{milestone.title}</strong>
                      {milestone.description && <p>{milestone.description}</p>}
                      {milestone.target_date && (
                        <span className="deadline">📅 {milestone.target_date}</span>
                      )}
                    </div>
                    <div className="milestone-actions">
                      <button onClick={() => handleEditMilestone(index)}>✏️</button>
                      <button onClick={() => handleDeleteMilestone(index)}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add/Edit milestone form */}
              <div className="milestone-form">
                <input
                  type="text"
                  placeholder="Название подцели"
                  value={newMilestone.title}
                  onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Описание (опционально)"
                  value={newMilestone.description}
                  onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                />
                <input
                  type="date"
                  placeholder="Дедлайн"
                  value={newMilestone.target_date}
                  onChange={(e) => setNewMilestone({ ...newMilestone, target_date: e.target.value })}
                />
                <div className="milestone-form-actions">
                  {editingMilestoneIndex !== null ? (
                    <>
                      <button onClick={handleSaveMilestone}>💾 Сохранить</button>
                      <button onClick={() => {
                        setEditingMilestoneIndex(null);
                        setNewMilestone({ title: '', description: '', target_date: '' });
                      }}>❌ Отмена</button>
                    </>
                  ) : (
                    <button onClick={handleAddMilestone} disabled={!newMilestone.title.trim()}>
                      ➕ Добавить подцель
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button onClick={() => onNavigate()} className="cancel-btn">
              Отмена
            </button>
            <button
              onClick={handleCreateGoal}
              disabled={!goalTitle.trim() || creating}
              className="create-btn"
            >
              {creating ? 'Создание...' : '✅ Создать цель'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="error-message">{error}</div>
      )}
    </div>
  );
};

export default CreateGoal;
