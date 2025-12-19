import React, { useState, useEffect } from 'react';
import ChatInterface from '../components/ChatInterface';
import ProgressBar from '../components/ProgressBar';
import GoalDetailModal from '../components/GoalDetailModal';
import { milestonesAPI, tasksAPI, Milestone, Task, Goal as ApiGoal } from '../services/api';
import { DebugSettings } from '../components/DebugMenu';
import './ChatView.css';

interface Message {
  id: number;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface Goal {
  id: number;
  title: string;
  description?: string;
  user_id?: number;
  created_at?: string;
  updated_at?: string;
}

interface ChatViewProps {
  goal: Goal | null;
  onBack: () => void;
  onDeleteGoal?: (goalId: number) => void;
  onGoalCreated?: (newGoal: ApiGoal) => void;
  debugSettings?: DebugSettings;
}

const ChatView: React.FC<ChatViewProps> = ({ goal, onBack, onDeleteGoal, onGoalCreated, debugSettings }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingMilestones, setLoadingMilestones] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [nearestDeadline, setNearestDeadline] = useState<{deadline: string, type: string, formatted: string, title?: string} | null>(null);

  const [chatId, setChatId] = useState<number | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [processedGoalIds, setProcessedGoalIds] = useState<Set<number>>(new Set());
  const [lastMessageId, setLastMessageId] = useState<number>(0);

  const loadMilestones = async (showLoading = false) => {
    if (!goal) return;
    
    // Only show loading indicator if explicitly requested AND it's the initial load
    const shouldShowLoading = showLoading && isInitialLoad;
    
    try {
      if (shouldShowLoading) {
        setLoadingMilestones(true);
      }
      console.log(`Loading milestones for goal ${goal.id}...`);
      const fetchedMilestones = await milestonesAPI.getByGoalId(goal.id);
      console.log('Loaded milestones:', fetchedMilestones);
      if (Array.isArray(fetchedMilestones)) {
        setMilestones(fetchedMilestones);
      } else {
        console.warn('Milestones API returned non-array:', fetchedMilestones);
        setMilestones([]);
      }
      
      // Load nearest deadline
      await loadNearestDeadline();
    } catch (err) {
      console.error('Failed to load milestones:', err);
      // Debug mode: log full error
      const errorDetails = err instanceof Error 
        ? `${err.message}\n\nStack:\n${err.stack}\n\nFull error: ${JSON.stringify(err, Object.getOwnPropertyNames(err), 2)}`
        : `Error: ${JSON.stringify(err, null, 2)}`;
      console.error('Full milestone loading error:', errorDetails);
      // Don't clear milestones on error, keep existing ones
      // setMilestones([]);
    } finally {
      if (shouldShowLoading) {
        setLoadingMilestones(false);
      }
      // Mark initial load as complete after first successful load
      if (isInitialLoad && !shouldShowLoading) {
        setIsInitialLoad(false);
      } else if (isInitialLoad && shouldShowLoading) {
        // Wait for loading to complete before marking as done
        setTimeout(() => setIsInitialLoad(false), 100);
      }
    }
  };

  const loadTasks = async (showLoading = false) => {
    if (!goal) return;
    
    // Only show loading indicator if explicitly requested AND it's the initial load
    const shouldShowLoading = showLoading && isInitialLoad;
    
    try {
      if (shouldShowLoading) {
        setLoadingTasks(true);
      }
      console.log(`📝 Loading tasks for goal ${goal.id}...`);
      const fetchedTasks = await tasksAPI.getByGoalId(goal.id, false); // Only pending tasks
      console.log(`📝 Loaded ${fetchedTasks?.length || 0} tasks:`, fetchedTasks);
      if (Array.isArray(fetchedTasks)) {
        setTasks(fetchedTasks);
      } else {
        console.warn('Tasks API returned non-array:', fetchedTasks);
        setTasks([]);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
      // Tasks table might not exist yet, that's OK
      setTasks([]);
    } finally {
      if (shouldShowLoading) {
        setLoadingTasks(false);
      }
    }
  };

  const loadNearestDeadline = async () => {
    if (!goal) return;
    
    try {
      const { getApiUrl } = await import('../config/api');
      const response = await fetch(getApiUrl(`/api/goals/${goal.id}/nearest-deadline/`));
      if (response.ok) {
        const data = await response.json();
        console.log('Nearest deadline data:', data);
        if (data && data.formatted && data.deadline) {
          console.log('✅ Setting nearest deadline:', data);
          setNearestDeadline(data);
        } else {
          console.log('ℹ️ No nearest deadline found (empty response)');
          setNearestDeadline(null);
        }
      } else if (response.status === 404) {
        // No deadline found - this is OK
        console.log('No deadline endpoint or no deadlines');
        setNearestDeadline(null);
      } else {
        console.error('Failed to load nearest deadline:', response.status, response.statusText);
        setNearestDeadline(null);
      }
    } catch (err) {
      console.error('Failed to load nearest deadline:', err);
      setNearestDeadline(null);
    }
  };

  const completedCount = milestones.filter(m => m.completed || m.is_completed).length;
  const progress = milestones.length > 0 
    ? Math.round((completedCount / milestones.length) * 100) 
    : 0;

  useEffect(() => {
    if (goal) {
      setIsInitialLoad(true);
      initializeChat();
      loadMilestones(true);
      loadTasks(true);
      // Reload milestones and tasks periodically to catch updates (silently, without loading indicator)
      const interval = setInterval(() => {
        loadMilestones(false); // Silent update
        loadTasks(false); // Silent update
      }, 10000); // Every 10 seconds (reduced frequency)
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal]);

  // Heartbeat to register activity
  useEffect(() => {
    if (!chatId) return;
    
    const sendHeartbeat = async () => {
      try {
        const { getApiUrl } = await import('../config/api');
        await fetch(getApiUrl(`/api/chats/${chatId}/heartbeat/`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (err) {
        // Ignore heartbeat errors
      }
    };
    
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [chatId]);

  // Poll for proactive messages from AI
  useEffect(() => {
    if (!chatId || loadingAI) return;
    
    const checkNewMessages = async () => {
      try {
        const { getApiUrl } = await import('../config/api');
        const response = await fetch(getApiUrl(`/api/chats/${chatId}/new-messages/?after_id=${lastMessageId}`));
        if (response.ok) {
          const newMessages = await response.json();
          if (newMessages.length > 0) {
            // Add new proactive messages
            const formattedNewMessages = newMessages.map((m: any) => ({
              id: m.id,
              content: m.content,
              sender: m.sender as 'user' | 'ai',
              timestamp: new Date(m.created_at || Date.now())
            }));
            
            setMessages(prev => {
              const existingIds = new Set(prev.map(m => m.id));
              const uniqueNew = formattedNewMessages.filter((m: Message) => !existingIds.has(m.id));
              if (uniqueNew.length > 0) {
                console.log('📥 Received proactive messages:', uniqueNew.length);
                return [...prev, ...uniqueNew];
              }
              return prev;
            });
            
            // Update last message ID
            const maxId = Math.max(...newMessages.map((m: any) => m.id));
            setLastMessageId(maxId);
            
            // Reload milestones in case of updates (silent)
            loadMilestones(false);
          }
        }
      } catch (err) {
        // Ignore polling errors
      }
    };
    
    const interval = setInterval(checkNewMessages, 10000); // Every 10 seconds
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, lastMessageId, loadingAI]);

  const initializeChat = async () => {
    if (!goal) return;
    
    try {
      const { chatsAPI } = await import('../services/api');
      // Get or create chat for this goal
      const chats = await chatsAPI.getByGoalId(goal.id);
      if (chats.length > 0) {
        setChatId(chats[0].id);
        // Load messages
        const messages = await chatsAPI.getMessages(chats[0].id);
        setMessages(messages.map(m => ({
          id: m.id,
          content: m.content,
          sender: m.sender as 'user' | 'ai',
          timestamp: new Date(m.created_at || m.timestamp || Date.now())
        })));
        // Track last message ID for proactive polling
        if (messages.length > 0) {
          const maxId = Math.max(...messages.map(m => m.id));
          setLastMessageId(maxId);
        }
      } else {
        // Create new chat
        const newChat = await chatsAPI.create({ goal_id: goal.id });
        setChatId(newChat.id);
        
        // Generate AI greeting dynamically
        setMessages([{
          id: 0,
          content: "...",
          sender: 'ai',
          timestamp: new Date()
        }]);
        setLoadingAI(true);
        
        try {
          const { getApiUrl } = await import('../config/api');
          const greetingResponse = await fetch(getApiUrl(`/api/chats/${newChat.id}/generate-greeting/`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (greetingResponse.ok) {
            const greeting = await greetingResponse.json();
            setMessages([{
              id: greeting.id,
              content: greeting.content,
              sender: 'ai',
              timestamp: new Date(greeting.created_at || Date.now())
            }]);
            setLastMessageId(greeting.id);
          } else {
            // Fallback
            setMessages([{
              id: 1,
              content: `Привет! 👋 Как дела с целью "${goal.title}"?`,
              sender: 'ai',
              timestamp: new Date()
            }]);
          }
        } catch (err) {
          console.error('Failed to generate greeting:', err);
          setMessages([{
            id: 1,
            content: `Привет! 👋 Как дела с целью "${goal.title}"?`,
            sender: 'ai',
            timestamp: new Date()
          }]);
        } finally {
          setLoadingAI(false);
        }
      }
    } catch (err) {
      console.log('Failed to initialize chat:', err);
      // Fallback to demo mode - still try to generate greeting
      setMessages([{
        id: 1,
        content: `Привет! 👋 Как дела с целью "${goal?.title || 'твоей'}"?`,
        sender: 'ai',
        timestamp: new Date()
      }]);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!goal) return;

    const userMessage: Message = {
      id: Date.now(),
      content,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setLoadingAI(true);

    try {
      const { chatsAPI } = await import('../services/api');
      
      // Ensure chat exists
      let currentChatId = chatId;
      if (!currentChatId) {
        const newChat = await chatsAPI.create({ goal_id: goal.id });
        currentChatId = newChat.id;
        setChatId(currentChatId);
      }
      
      // Send message - backend will automatically generate AI response
      const debugModeEnabled = (debugSettings?.parseJson && debugSettings?.executeActions) || false;
      await chatsAPI.sendMessage(currentChatId, content, 'user', debugModeEnabled);
      
      // Poll for AI response - check multiple times
      let attempts = 0;
      const maxAttempts = 10;
      const pollInterval = 1000; // 1 second
      
      const pollForResponse = async () => {
        try {
          const updatedMessages = await chatsAPI.getMessages(currentChatId!);
          
          // Check if we have a new AI response
          // Compare by checking if there are more total messages than we currently have
          const currentMessageCount = messages.length;
          const updatedMessageCount = updatedMessages.length;
          
          if (updatedMessageCount > currentMessageCount || attempts >= maxAttempts) {
            // Update all messages - ensure content is always a string
            const formattedMessages = updatedMessages.map(m => {
              let content = m.content;
              if (typeof content !== 'string') {
                if (content && typeof content === 'object') {
                  // Debug mode: show full object structure
                  const obj = content as any;
                  const errorStr = JSON.stringify(obj, null, 2);
                  content = `❌ Error object received (Debug Mode):\n\n${obj.detail || obj.message || obj.error || errorStr}\n\nFull object:\n${errorStr}`;
                } else {
                  content = String(content || '');
                }
              }
              return {
                id: m.id,
                content: content,
                sender: m.sender as 'user' | 'ai',
                timestamp: new Date(m.created_at || m.timestamp || Date.now())
              };
            });
            setMessages(formattedMessages);
            
            // Update last message ID for proactive polling
            if (formattedMessages.length > 0) {
              const maxId = Math.max(...formattedMessages.map(m => m.id));
              setLastMessageId(maxId);
            }
            
            // Check if AI created a new goal in the LAST message
            if (onGoalCreated && formattedMessages.length > 0) {
              // Get the last AI message
              const lastAiMessage = [...formattedMessages].reverse().find(m => m.sender === 'ai');
              if (lastAiMessage) {
                console.log('Checking last AI message for new goal:', lastAiMessage.content.substring(0, 100));
                // Look for pattern: "Создана новая цель: {title} (ID: {id})"
                const goalMatch = lastAiMessage.content.match(/Создана новая цель[^:]*:\s*([^(]+)\s*\(ID:\s*(\d+)\)/);
                console.log('Goal match result:', goalMatch);
                if (goalMatch) {
                  const goalTitle = goalMatch[1].trim();
                  const goalId = parseInt(goalMatch[2], 10);
                  console.log('Found new goal:', goalTitle, goalId, 'processedGoalIds:', processedGoalIds);
                  // Only process if not already processed
                  if (goalId && !isNaN(goalId) && !processedGoalIds.has(goalId)) {
                    console.log('Processing new goal:', goalId);
                    setProcessedGoalIds(prev => new Set(prev).add(goalId));
                    // Load the new goal and notify parent
                    try {
                      const { goalsAPI } = await import('../services/api');
                      const newGoal = await goalsAPI.getById(goalId);
                      console.log('Loaded new goal, calling onGoalCreated:', newGoal);
                      onGoalCreated(newGoal);
                    } catch (err) {
                      console.error('Failed to load new goal:', err);
                    }
                  }
                }
              }
            }
            
            // Reload milestones if AI might have created/updated them (silent)
            await loadMilestones(false);
            setLoadingAI(false);
          } else {
            // Continue polling
            attempts++;
            setTimeout(pollForResponse, pollInterval);
          }
        } catch (err) {
          console.error('Failed to get AI response:', err);
          attempts++;
          if (attempts >= maxAttempts) {
            // Debug mode: show full error details
            const errorDetails = err instanceof Error 
              ? `${err.message}\n\nStack:\n${err.stack}\n\nFull error: ${JSON.stringify(err, Object.getOwnPropertyNames(err), 2)}`
              : `Error: ${JSON.stringify(err, null, 2)}`;
            
            const fallbackResponse: Message = {
              id: Date.now() + 1,
              content: `❌ Error (Debug Mode):\n\n${errorDetails}`,
              sender: 'ai',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, fallbackResponse]);
            setLoadingAI(false);
          } else {
            setTimeout(pollForResponse, pollInterval);
          }
        }
      };
      
      // Start polling after a short delay
      setTimeout(pollForResponse, 1000);
    } catch (err) {
      console.error('Failed to send message:', err);
      // Debug mode: show full error details
      const errorDetails = err instanceof Error 
        ? `${err.message}\n\nStack:\n${err.stack}\n\nFull error: ${JSON.stringify(err, Object.getOwnPropertyNames(err), 2)}`
        : `Error: ${JSON.stringify(err, null, 2)}`;
      
      const errorResponse: Message = {
        id: Date.now() + 1,
        content: `❌ Error sending message (Debug Mode):\n\n${errorDetails}`,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
      setLoadingAI(false);
    }
  };

  if (!goal) {
    return (
      <div className="chat-view empty">
        <div className="empty-chat">
          <div className="empty-icon">🎯</div>
          <h2>Welcome to AI Goal Tracker</h2>
          <p>Select a goal from the left to start chatting, or create a new goal to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-view">
      <div className="chat-header">
        <div className="chat-header-info">
          <h2>{goal.title}</h2>
          {goal.description && <p className="goal-description">{goal.description}</p>}
          <div 
            className="header-progress clickable"
            onClick={() => setShowDetailModal(true)}
            title="Нажмите для просмотра деталей"
          >
            {loadingMilestones && isInitialLoad ? (
              <div className="progress-loading">Loading progress...</div>
            ) : (
              <>
                <div className="header-progress-info">
                  <span className="progress-text">
                    {milestones.length > 0 
                      ? `${completedCount}/${milestones.length} milestones`
                      : 'No milestones yet'
                    }
                    {tasks.length > 0 && (
                      <span style={{ marginLeft: '12px', color: '#666' }}>
                        • {tasks.filter(t => !t.is_completed).length} задач
                      </span>
                    )}
                  </span>
                  <span className="progress-percent">{progress}%</span>
                </div>
                <div onClick={e => e.stopPropagation()}>
                  <ProgressBar 
                    progress={progress} 
                    milestones={milestones.map(m => ({
                      id: m.id,
                      title: m.title,
                      completed: m.completed || m.is_completed,
                      target_date: m.target_date
                    }))}
                    onMilestoneClick={async (milestone) => {
                      try {
                        const m = milestones.find(ms => ms.id === milestone.id);
                        if (m) {
                          const currentStatus = m.completed || m.is_completed || false;
                          await milestonesAPI.update(m.id, { completed: !currentStatus });
                          await loadMilestones(false);
                          await loadTasks(false);
                          await loadNearestDeadline();
                        }
                      } catch (err) {
                        console.error('Failed to toggle milestone:', err);
                      }
                    }}
                    onSetDeadline={async (milestone, date) => {
                      try {
                        await milestonesAPI.update(milestone.id, { target_date: date });
                        await loadMilestones(false);
                        await loadTasks(false);
                        await loadNearestDeadline();
                      } catch (err) {
                        console.error('Failed to set deadline:', err);
                      }
                    }}
                  />
                </div>
                {nearestDeadline && nearestDeadline.formatted && (
                  <div className="nearest-deadline-info" style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    fontSize: '14px',
                    color: '#333',
                    backgroundColor: '#f0f7ff',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    border: '1px solid #d0e7ff'
                  }}>
                    <span style={{ fontSize: '18px' }}>⏰</span>
                    <span>
                      Ближайший дедлайн: <strong style={{ color: '#0066cc' }}>{nearestDeadline.formatted}</strong>
                      {nearestDeadline.title && ` (${nearestDeadline.title.substring(0, 30)}${nearestDeadline.title.length > 30 ? '...' : ''})`}
                      {nearestDeadline.type === 'task' && ' 📝 задача'}
                      {nearestDeadline.type === 'milestone' && ' 🎯 подцель'}
                    </span>
                  </div>
                )}
                
                {/* Tasks Widget */}
                {tasks.length > 0 && (
                  <div className="tasks-widget" style={{
                    marginTop: '12px',
                    padding: '12px',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#333' }}>
                        📝 Задачи ({tasks.filter(t => !t.is_completed).length})
                      </h4>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {tasks
                        .filter(t => !t.is_completed)
                        .slice(0, 3)
                        .map(task => (
                          <div 
                            key={task.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '6px 8px',
                              backgroundColor: '#fff',
                              borderRadius: '4px',
                              fontSize: '13px'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={false}
                              onChange={async () => {
                                try {
                                  await tasksAPI.update(task.id, { is_completed: true });
                                  await loadTasks(false);
                                  await loadNearestDeadline();
                                } catch (err) {
                                  console.error('Failed to complete task:', err);
                                }
                              }}
                              style={{ cursor: 'pointer' }}
                            />
                            <span style={{ flex: 1, color: '#333' }}>{task.title}</span>
                            {task.due_date && (
                              <span style={{ 
                                fontSize: '11px', 
                                color: '#666',
                                whiteSpace: 'nowrap'
                              }}>
                                {new Date(task.due_date).toLocaleDateString('ru-RU', { 
                                  day: '2-digit', 
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            )}
                          </div>
                        ))}
                      {tasks.filter(t => !t.is_completed).length > 3 && (
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#666', 
                          textAlign: 'center',
                          paddingTop: '4px'
                        }}>
                          +{tasks.filter(t => !t.is_completed).length - 3} ещё
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {milestones.length === 0 && (
                  <button 
                    className="create-plan-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Trigger plan creation in chat
                      const planMessage = "I want to create a plan with milestones for this goal";
                      handleSendMessage(planMessage);
                    }}
                  >
                    Create Plan
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="chat-messages-container">
        <ChatInterface 
          goalId={goal.id} 
          chatId={chatId || undefined}
          messages={messages} 
          onSendMessage={handleSendMessage}
          disabled={loadingAI}
          debugMode={debugSettings?.showRawResponse || false}
          onSubmitChecklist={async (checklistId, answers, checklistData) => {
            if (!chatId) return;
            try {
              setLoadingAI(true);
              const { getApiUrl } = await import('../config/api');
              const response = await fetch(getApiUrl(`/api/chats/${chatId}/submit-checklist/`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  checklist_id: checklistId, 
                  answers,
                  title: checklistData?.title || 'Проверка',
                  items: checklistData?.items || []
                })
              });
              if (response.ok) {
                // Reload messages to show AI response
                const { chatsAPI } = await import('../services/api');
                const freshMessages = await chatsAPI.getMessages(chatId);
                setMessages(freshMessages.map((m: any) => ({
                  id: m.id,
                  content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
                  sender: m.sender,
                  timestamp: new Date(m.created_at || m.timestamp || Date.now())
                })));
                // Reload milestones and tasks (silent)
                await loadMilestones(false);
                await loadTasks(false);
                await loadNearestDeadline();
              } else {
                const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
                console.error('Failed to submit checklist:', errorData);
                alert(`Ошибка при отправке чеклиста: ${errorData.detail || 'Неизвестная ошибка'}`);
              }
            } catch (err) {
              console.error('Failed to submit checklist:', err);
              alert(`Ошибка при отправке чеклиста: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
            } finally {
              setLoadingAI(false);
            }
          }}
          onConfirmActions={async (actions) => {
            if (!chatId) return;
            try {
              const { getApiUrl } = await import('../config/api');
              const response = await fetch(getApiUrl(`/api/chats/${chatId}/confirm-actions/`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(actions)
              });
              if (response.ok) {
                // Reload messages to show confirmation
                const { chatsAPI } = await import('../services/api');
                const freshMessages = await chatsAPI.getMessages(chatId);
                setMessages(freshMessages.map((m: any) => ({
                  id: m.id,
                  content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
                  sender: m.sender,
                  timestamp: new Date(m.created_at || m.timestamp || Date.now())
                })));
                // Reload milestones, tasks and nearest deadline (silent)
                await loadMilestones(false);
                await loadTasks(false);
                await loadNearestDeadline();
              }
            } catch (err) {
              console.error('Failed to confirm actions:', err);
            }
          }}
          onCancelActions={async () => {
            if (!chatId) return;
            try {
              const { getApiUrl } = await import('../config/api');
              const response = await fetch(getApiUrl(`/api/chats/${chatId}/cancel-actions/`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              });
              if (response.ok) {
                // Reload messages
                const { chatsAPI } = await import('../services/api');
                const freshMessages = await chatsAPI.getMessages(chatId);
                setMessages(freshMessages.map((m: any) => ({
                  id: m.id,
                  content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
                  sender: m.sender,
                  timestamp: new Date(m.created_at || m.timestamp || Date.now())
                })));
              }
            } catch (err) {
              console.error('Failed to cancel actions:', err);
            }
          }}
        />
        {loadingAI && (
          <div style={{ padding: '10px', textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>
            AI думает...
          </div>
        )}
      </div>

      {/* Goal Detail Modal */}
      <GoalDetailModal
        goal={goal as ApiGoal}
        milestones={milestones}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onUpdate={loadMilestones}
        onDelete={onDeleteGoal ? (goalId) => {
          onDeleteGoal(goalId);
          onBack();
        } : undefined}
      />
    </div>
  );
};

export default ChatView;

