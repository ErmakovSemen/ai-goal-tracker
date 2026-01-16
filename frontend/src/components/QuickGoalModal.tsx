import React, { useState } from 'react';
import { useI18n } from '../i18n';
import './QuickGoalModal.css';

interface QuickGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGoal: (title: string, description?: string) => Promise<void>;
  onOpenFullEditor?: () => void;
}

const QuickGoalModal: React.FC<QuickGoalModalProps> = ({ isOpen, onClose, onCreateGoal, onOpenFullEditor }) => {
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError(t('enter_goal_name'));
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
      setError(err instanceof Error ? err.message : t('goal_create_error'));
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
          <h2>✨ {t('quick_goal_title')}</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="goal-title">{t('goal_title_label')}</label>
            <input
              id="goal-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('goal_title_placeholder')}
              autoFocus
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label htmlFor="goal-description">{t('goal_description_label')}</label>
            <textarea
              id="goal-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('goal_description_placeholder')}
              rows={3}
              disabled={saving}
            />
          </div>

          {error && (
            <div className="error-message">{error}</div>
          )}

          <div className="quick-goal-actions">
            <button type="button" className="cancel-btn" onClick={handleClose} disabled={saving}>
              {t('cancel')}
            </button>
            <button type="submit" className="create-btn" disabled={saving || !title.trim()}>
              {saving ? t('creating') : `🎯 ${t('create_goal')}`}
            </button>
          </div>
        </form>

        <div className="quick-goal-tip">
          💡 {t('goal_tip')}
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
                🤖 {t('create_goal_with_ai')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickGoalModal;


