import React, { useState } from 'react';
import './ChatInterface.css';
import ChecklistComponent, { ChecklistData } from './ChecklistComponent';

interface PendingAction {
  type: string;
  data: Record<string, any>;
}

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

interface ChatInterfaceProps {
  goalId: number;
  chatId?: number;
  messages: Message[];
  onSendMessage: (content: string) => void;
  onAction?: (action: string, data?: any) => void;
  onConfirmActions?: (actions: PendingAction[]) => Promise<void>;
  onCancelActions?: () => Promise<void>;
  onSubmitChecklist?: (checklistId: string, answers: Record<string | number, boolean | number | string>, checklistData?: { title: string; items: any[] }) => Promise<void>;
  disabled?: boolean;
  debugMode?: boolean;
}

// Helper to parse pending actions from message content
const parsePendingActions = (content: string): { cleanContent: string; pendingActions: PendingAction[] } => {
  const match = content.match(/<!--PENDING_ACTIONS:([\s\S]*?)-->/);
  if (match) {
    try {
      const actions = JSON.parse(match[1]);
      const cleanContent = content.replace(/<!--PENDING_ACTIONS:[\s\S]*?-->/, '').trim();
      return { cleanContent, pendingActions: Array.isArray(actions) ? actions : [] };
    } catch (e) {
      console.error('Failed to parse pending actions:', e);
    }
  }
  return { cleanContent: content, pendingActions: [] };
};

// Helper to format pending action for display
const formatActionForDisplay = (action: PendingAction): string => {
  const { type, data } = action;
  
  switch (type) {
    case 'create_milestone':
      return `📌 Создать подцель: ${data.title || 'без названия'}`;
    case 'complete_milestone':
      return `✅ Отметить выполненной: подцель #${data.milestone_id}`;
    case 'delete_milestone':
      if (data.count) {
        return `🗑 Удалить последние ${data.count} подцелей`;
      }
      return `🗑 Удалить подцель #${data.milestone_id}`;
    case 'set_deadline':
      const target = data.milestone_title || `#${data.milestone_id}`;
      return `📅 Установить дедлайн для «${target}»: ${data.deadline}`;
    case 'create_goal':
      return `🎯 Создать цель: ${data.title || 'без названия'}`;
    case 'create_agreement':
      return `📝 Зафиксировать: ${data.description?.substring(0, 50) || 'договорённость'}... (до ${data.deadline})`;
    case 'update_goal':
      return `✏️ Обновить цель`;
    default:
      return `🔧 ${type}: ${JSON.stringify(data).substring(0, 50)}...`;
  }
};

// Helper to parse checklist from message content
const parseChecklist = (content: string): { cleanContent: string; checklist: ChecklistData | null } => {
  const match = content.match(/<!--CHECKLIST:([\s\S]*?)-->/);
  if (match) {
    try {
      const checklistData = JSON.parse(match[1]);
      const cleanContent = content.replace(/<!--CHECKLIST:[\s\S]*?-->/, '').trim();
      return { cleanContent, checklist: checklistData as ChecklistData };
    } catch (e) {
      console.error('Failed to parse checklist:', e);
    }
  }
  return { cleanContent: content, checklist: null };
};

// Helper to parse suggestions from message content
const parseSuggestions = (content: string): { cleanContent: string; suggestions: string[] } => {
  const match = content.match(/<!--SUGGESTIONS:([\s\S]*?)-->/);
  if (match) {
    try {
      const suggestions = JSON.parse(match[1]);
      const cleanContent = content.replace(/<!--SUGGESTIONS:[\s\S]*?-->/, '').trim();
      return { cleanContent, suggestions: Array.isArray(suggestions) ? suggestions : [] };
    } catch (e) {
      console.error('Failed to parse suggestions:', e);
    }
  }
  return { cleanContent: content, suggestions: [] };
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  goalId, 
  chatId,
  messages, 
  onSendMessage, 
  onAction, 
  onConfirmActions,
  onCancelActions,
  onSubmitChecklist,
  disabled = false, 
  debugMode = false 
}) => {
  const [inputValue, setInputValue] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [submittingChecklist, setSubmittingChecklist] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !disabled) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleConfirm = async (actions: PendingAction[]) => {
    if (onConfirmActions && !confirming) {
      setConfirming(true);
      try {
        await onConfirmActions(actions);
      } catch (e) {
        console.error('Error confirming actions:', e);
      } finally {
        setConfirming(false);
      }
    }
  };

  const handleCancel = async () => {
    if (onCancelActions && !confirming) {
      setConfirming(true);
      try {
        await onCancelActions();
      } catch (e) {
        console.error('Error cancelling actions:', e);
      } finally {
        setConfirming(false);
      }
    }
  };

  const handleChecklistSubmit = async (checklistId: string, answers: Record<string | number, boolean | number | string>, checklistData?: { title: string; items: any[] }) => {
    if (onSubmitChecklist && !submittingChecklist) {
      setSubmittingChecklist(checklistId);
      try {
        await onSubmitChecklist(checklistId, answers, checklistData);
      } catch (e) {
        console.error('Error submitting checklist:', e);
      } finally {
        setSubmittingChecklist(null);
      }
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((message, msgIndex) => {
          // Parse pending actions and checklist from AI messages
          const { cleanContent: contentAfterActions, pendingActions } = message.sender === 'ai' 
            ? parsePendingActions(message.content)
            : { cleanContent: message.content, pendingActions: [] };
          
          const { cleanContent: contentAfterChecklist, checklist } = message.sender === 'ai'
            ? parseChecklist(contentAfterActions)
            : { cleanContent: contentAfterActions, checklist: null };
          
          // Also parse suggestions (but don't display them inline - they go above input)
          const { cleanContent } = message.sender === 'ai'
            ? parseSuggestions(contentAfterChecklist)
            : { cleanContent: contentAfterChecklist };
          
          // Check if this is the last AI message with pending actions or checklist
          const isLastMessage = msgIndex === messages.length - 1;
          const hasPendingActions = pendingActions.length > 0 && isLastMessage;
          const hasChecklist = checklist !== null && isLastMessage;
          
          // Clean debug markers for display
          let displayContent = cleanContent;
          if (!debugMode) {
            // Remove debug sections for non-debug mode
            displayContent = displayContent.replace(/━+\n🔧 DEBUG LOG:[\s\S]*$/m, '').trim();
          }
          
          return (
            <div key={message.id} className={`message ${message.sender}`}>
              <div className="message-content">
                {displayContent.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line.startsWith('**') && line.endsWith('**') 
                      ? <strong>{line.slice(2, -2)}</strong>
                      : line.startsWith('📌') || line.startsWith('✅') || line.startsWith('🗑')
                        ? <span className="action-preview">{line}</span>
                        : line
                    }
                    {i < displayContent.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
              
              {/* Checklist Component */}
              {hasChecklist && checklist && (
                <ChecklistComponent
                  checklist={checklist}
                  onSubmit={(answers) => handleChecklistSubmit(`checklist-${message.id}`, answers, checklist)}
                  disabled={disabled || submittingChecklist === `checklist-${message.id}`}
                />
              )}
              
              {/* Pending Actions Preview and Confirmation Buttons */}
              {hasPendingActions && !hasChecklist && (
                <div className="pending-actions-container">
                  <div className="pending-actions-preview">
                    <div className="pending-actions-header">📋 Предлагаемые действия:</div>
                    <div className="pending-actions-list">
                      {pendingActions
                        .filter(a => a.type !== 'suggestions')
                        .map((action, idx) => (
                          <div key={idx} className="pending-action-item">
                            {formatActionForDisplay(action)}
                          </div>
                        ))}
                    </div>
                  </div>
                  <div className="pending-actions-buttons">
                    <button
                      type="button"
                      className="confirm-actions-btn"
                      onClick={() => handleConfirm(pendingActions)}
                      disabled={confirming || disabled}
                    >
                      {confirming ? '⏳ Выполняется...' : '✅ Подтвердить'}
                    </button>
                    <button
                      type="button"
                      className="cancel-actions-btn"
                      onClick={handleCancel}
                      disabled={confirming || disabled}
                    >
                      ❌ Отменить
                    </button>
                  </div>
                </div>
              )}
              
              {/* Debug: Show pending actions JSON */}
              {debugMode && pendingActions.length > 0 && (
                <div className="debug-pending-actions">
                  <strong>🔧 Pending Actions:</strong>
                  <pre>{JSON.stringify(pendingActions, null, 2)}</pre>
                </div>
              )}
              
              {/* Legacy action buttons (from CreateGoal flow) */}
              {message.actions && message.actions.length > 0 && (
                <div className="message-actions" onClick={(e) => e.stopPropagation()}>
                  {message.actions.map((action, idx) => (
                    <button
                      key={`${message.id}-action-${idx}`}
                      type="button"
                      className={`action-button ${action.action.includes('cancel') ? 'cancel' : 'confirm'}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!disabled && onAction) {
                          onAction(action.action, action.data);
                        }
                      }}
                      disabled={disabled}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
              
              <div className="message-time">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Quick reply suggestions */}
      {(() => {
        // Get suggestions from the last AI message
        const lastAiMessage = [...messages].reverse().find(m => m.sender === 'ai');
        if (lastAiMessage && !disabled) {
          const { suggestions } = parseSuggestions(lastAiMessage.content);
          if (suggestions.length > 0) {
            return (
              <div className="suggestions-container">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="suggestion-btn"
                    onClick={() => {
                      onSendMessage(suggestion);
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            );
          }
        }
        return null;
      })()}
      
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={disabled ? "Подождите..." : "Введите сообщение..."}
          className="chat-input"
          disabled={disabled || confirming || submittingChecklist !== null}
        />
        <button type="submit" className="send-button" disabled={disabled || confirming || submittingChecklist !== null}>
          Отправить
        </button>
      </form>
    </div>
  );
};

export default ChatInterface;
