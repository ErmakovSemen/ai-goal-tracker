import React, { useState } from 'react';
import './QuickGoalModal.css';

interface QuickGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGoal: (title: string, description?: string) => Promise<void>;
  onOpenFullEditor?: () => void;
}

const QuickGoalModal: React.FC<QuickGoalModalProps> = ({ isOpen, onClose, onCreateGoal, onOpenFullEditor }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Введите название цели');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onCreateGoal(title.trim(), description.trim() || undefined);
      setTitle('');
      setDescription('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при создании цели');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setError(null);
    onClose();
  };

  return (
    <div className="quick-goal-overlay" onClick={handleClose}>
      <div className="quick-goal-modal" onClick={e => e.stopPropagation()}>
        <div className="quick-goal-header">
          <h2>✨ Новая цель</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="goal-title">Название цели *</label>
            <input
              id="goal-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Выучить испанский"
              autoFocus
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label htmlFor="goal-description">Описание (опционально)</label>
            <textarea
              id="goal-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Подробности о цели, мотивация, сроки..."
              rows={3}
              disabled={saving}
            />
          </div>

          {error && (
            <div className="error-message">{error}</div>
          )}

          <div className="quick-goal-actions">
            <button type="button" className="cancel-btn" onClick={handleClose} disabled={saving}>
              Отмена
            </button>
            <button type="submit" className="create-btn" disabled={saving || !title.trim()}>
              {saving ? 'Создание...' : '🎯 Создать цель'}
            </button>
          </div>
        </form>

        <div className="quick-goal-tip">
          💡 После создания вы сможете добавить подцели и обсудить план с AI
          {onOpenFullEditor && (
            <div className="ai-assistant-section">
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onOpenFullEditor();
                }}
                className="ai-assistant-btn"
              >
                🤖 Создать с AI-ассистентом
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickGoalModal;


