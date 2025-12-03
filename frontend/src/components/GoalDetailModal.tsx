import React, { useState, useEffect } from 'react';
import { Goal, Milestone, goalsAPI, milestonesAPI } from '../services/api';
import './GoalDetailModal.css';

interface GoalDetailModalProps {
  goal: Goal;
  milestones: Milestone[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onDelete?: (goalId: number) => void;
}

const GoalDetailModal: React.FC<GoalDetailModalProps> = ({
  goal,
  milestones,
  isOpen,
  onClose,
  onUpdate,
  onDelete
}) => {
  const [editedGoal, setEditedGoal] = useState({ title: goal.title, description: goal.description || '' });
  const [editedMilestones, setEditedMilestones] = useState<Milestone[]>(milestones);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setEditedGoal({ title: goal.title, description: goal.description || '' });
    setEditedMilestones(milestones);
    setHasChanges(false);
  }, [goal, milestones, isOpen]);

  if (!isOpen) return null;

  const handleGoalChange = (field: 'title' | 'description', value: string) => {
    setEditedGoal(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleMilestoneChange = (id: number, field: string, value: any) => {
    setEditedMilestones(prev => 
      prev.map(m => m.id === id ? { ...m, [field]: value } : m)
    );
    setHasChanges(true);
  };

  const handleToggleMilestone = async (milestone: Milestone) => {
    const newStatus = !(milestone.completed || milestone.is_completed);
    try {
      await milestonesAPI.update(milestone.id, { completed: newStatus });
      setEditedMilestones(prev =>
        prev.map(m => m.id === milestone.id 
          ? { ...m, completed: newStatus, is_completed: newStatus } 
          : m
        )
      );
      onUpdate();
    } catch (err) {
      console.error('Failed to toggle milestone:', err);
    }
  };

  const handleAddMilestone = async () => {
    if (!newMilestoneTitle.trim()) return;
    
    try {
      const created = await milestonesAPI.create({
        title: newMilestoneTitle.trim(),
        goal_id: goal.id
      });
      setEditedMilestones(prev => [...prev, created]);
      setNewMilestoneTitle('');
      onUpdate();
    } catch (err) {
      console.error('Failed to add milestone:', err);
    }
  };

  const handleDeleteMilestone = async (milestoneId: number) => {
    if (!window.confirm('Удалить этот milestone?')) return;
    
    try {
      await milestonesAPI.delete(milestoneId);
      setEditedMilestones(prev => prev.filter(m => m.id !== milestoneId));
      onUpdate();
    } catch (err) {
      console.error('Failed to delete milestone:', err);
    }
  };

  const handleSaveMilestone = async (milestone: Milestone) => {
    try {
      await milestonesAPI.update(milestone.id, {
        title: milestone.title,
        target_date: milestone.target_date
      });
      onUpdate();
    } catch (err) {
      console.error('Failed to save milestone:', err);
    }
  };

  const handleSaveGoal = async () => {
    setSaving(true);
    try {
      await goalsAPI.update(goal.id, {
        title: editedGoal.title,
        description: editedGoal.description
      });
      
      // Save all milestone changes
      for (const milestone of editedMilestones) {
        const original = milestones.find(m => m.id === milestone.id);
        if (original && (
          original.title !== milestone.title ||
          original.target_date !== milestone.target_date
        )) {
          await milestonesAPI.update(milestone.id, {
            title: milestone.title,
            target_date: milestone.target_date
          });
        }
      }
      
      setHasChanges(false);
      onUpdate();
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    return dateStr.split('T')[0]; // Get YYYY-MM-DD format
  };

  const isOverdue = (dateStr: string | null | undefined, completed: boolean) => {
    if (!dateStr || completed) return false;
    const deadline = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return deadline < today;
  };

  const completedCount = editedMilestones.filter(m => m.completed || m.is_completed).length;
  const progress = editedMilestones.length > 0 
    ? Math.round((completedCount / editedMilestones.length) * 100) 
    : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="goal-detail-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Детали цели</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          {/* Goal Info Section */}
          <div className="section goal-info-section">
            <label className="field-label">Название цели</label>
            <input
              type="text"
              className="goal-title-input"
              value={editedGoal.title}
              onChange={e => handleGoalChange('title', e.target.value)}
              placeholder="Название цели"
            />

            <label className="field-label">Описание</label>
            <textarea
              className="goal-description-input"
              value={editedGoal.description}
              onChange={e => handleGoalChange('description', e.target.value)}
              placeholder="Описание цели (опционально)"
              rows={3}
            />

            <div className="goal-stats">
              <div className="stat">
                <span className="stat-value">{progress}%</span>
                <span className="stat-label">прогресс</span>
              </div>
              <div className="stat">
                <span className="stat-value">{completedCount}/{editedMilestones.length}</span>
                <span className="stat-label">выполнено</span>
              </div>
              <div className="stat">
                <span className="stat-value">{new Date(goal.created_at).toLocaleDateString('ru-RU')}</span>
                <span className="stat-label">создана</span>
              </div>
            </div>
          </div>

          {/* Milestones Section */}
          <div className="section milestones-section">
            <h3>Milestones ({editedMilestones.length})</h3>
            
            <div className="milestones-list">
              {editedMilestones.map((milestone, index) => {
                const completed = milestone.completed || milestone.is_completed || false;
                const overdue = isOverdue(milestone.target_date, completed);
                
                return (
                  <div 
                    key={milestone.id} 
                    className={`milestone-row ${completed ? 'completed' : ''} ${overdue ? 'overdue' : ''}`}
                  >
                    <div className="milestone-number">{index + 1}</div>
                    
                    <button 
                      className={`milestone-checkbox ${completed ? 'checked' : ''}`}
                      onClick={() => handleToggleMilestone(milestone)}
                    >
                      {completed ? '✓' : ''}
                    </button>
                    
                    <input
                      type="text"
                      className="milestone-title-input"
                      value={milestone.title}
                      onChange={e => handleMilestoneChange(milestone.id, 'title', e.target.value)}
                      onBlur={() => handleSaveMilestone(milestone)}
                    />
                    
                    <div className="milestone-deadline">
                      <input
                        type="date"
                        className={`deadline-input ${overdue ? 'overdue' : ''}`}
                        value={formatDate(milestone.target_date)}
                        onChange={e => {
                          handleMilestoneChange(milestone.id, 'target_date', e.target.value || null);
                          // Auto-save deadline
                          setTimeout(() => handleSaveMilestone({ ...milestone, target_date: e.target.value || null }), 100);
                        }}
                      />
                      {overdue && <span className="overdue-badge">!</span>}
                    </div>
                    
                    <button 
                      className="delete-milestone-btn"
                      onClick={() => handleDeleteMilestone(milestone.id)}
                      title="Удалить"
                    >
                      🗑
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Add new milestone */}
            <div className="add-milestone-row">
              <input
                type="text"
                className="new-milestone-input"
                value={newMilestoneTitle}
                onChange={e => setNewMilestoneTitle(e.target.value)}
                placeholder="Новый milestone..."
                onKeyPress={e => e.key === 'Enter' && handleAddMilestone()}
              />
              <button 
                className="add-milestone-btn"
                onClick={handleAddMilestone}
                disabled={!newMilestoneTitle.trim()}
              >
                + Добавить
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {hasChanges && (
            <button 
              className="save-btn"
              onClick={handleSaveGoal}
              disabled={saving}
            >
              {saving ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          )}
          {onDelete && (
            <button 
              className="delete-goal-modal-btn" 
              onClick={() => {
                if (window.confirm(`Удалить цель "${goal.title}"? Это действие нельзя отменить.`)) {
                  onDelete(goal.id);
                  onClose();
                }
              }}
            >
              🗑️ Удалить цель
            </button>
          )}
          <button className="close-modal-btn" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoalDetailModal;

