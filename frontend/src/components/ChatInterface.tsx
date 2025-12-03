import React, { useState } from 'react';
import './ChatInterface.css';

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

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  goalId, 
  chatId,
  messages, 
  onSendMessage, 
  onAction, 
  onConfirmActions,
  onCancelActions,
  disabled = false, 
  debugMode = false 
}) => {
  const [inputValue, setInputValue] = useState('');
  const [confirming, setConfirming] = useState(false);

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

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((message, msgIndex) => {
          // Parse pending actions from AI messages
          const { cleanContent, pendingActions } = message.sender === 'ai' 
            ? parsePendingActions(message.content)
            : { cleanContent: message.content, pendingActions: [] };
          
          // Check if this is the last AI message with pending actions
          const isLastMessage = msgIndex === messages.length - 1;
          const hasPendingActions = pendingActions.length > 0 && isLastMessage;
          
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
              
              {/* Pending Actions Confirmation Buttons */}
              {hasPendingActions && (
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
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={disabled ? "Подождите..." : "Введите сообщение..."}
          className="chat-input"
          disabled={disabled || confirming}
        />
        <button type="submit" className="send-button" disabled={disabled || confirming}>
          Отправить
        </button>
      </form>
    </div>
  );
};

export default ChatInterface;
