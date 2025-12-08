import React, { useState } from 'react';
import './ChecklistComponent.css';

export interface ChecklistItem {
  id: number | string;
  label: string;
  type: 'boolean' | 'number' | 'text';
  unit?: string; // Для числовых значений (например, "раз", "км", "кг")
  value?: boolean | number | string;
  required?: boolean;
}

export interface ChecklistData {
  title: string;
  items: ChecklistItem[];
  description?: string;
}

interface ChecklistComponentProps {
  checklist: ChecklistData;
  onSubmit: (answers: Record<string | number, boolean | number | string>) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

const ChecklistComponent: React.FC<ChecklistComponentProps> = ({
  checklist,
  onSubmit,
  onCancel,
  disabled = false
}) => {
  const [answers, setAnswers] = useState<Record<string | number, boolean | number | string>>(() => {
    const initial: Record<string | number, boolean | number | string> = {};
    checklist.items.forEach(item => {
      if (item.type === 'boolean') {
        initial[item.id] = item.value ?? false;
      } else if (item.type === 'number') {
        initial[item.id] = item.value ?? 0;
      } else {
        initial[item.id] = item.value ?? '';
      }
    });
    return initial;
  });

  const handleBooleanChange = (itemId: number | string, checked: boolean) => {
    setAnswers(prev => ({ ...prev, [itemId]: checked }));
  };

  const handleNumberChange = (itemId: number | string, value: number) => {
    setAnswers(prev => ({ ...prev, [itemId]: value }));
  };

  const handleTextChange = (itemId: number | string, value: string) => {
    setAnswers(prev => ({ ...prev, [itemId]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(answers);
  };

  // Form validation - currently not blocking submit but can be used for UI hints
  const _isFormValid = React.useCallback(() => {
    return checklist.items.every(item => {
      if (item.required) {
        const value = answers[item.id];
        if (item.type === 'boolean') {
          return value === true;
        } else if (item.type === 'number') {
          return typeof value === 'number' && value >= 0;
        } else {
          return typeof value === 'string' && value.trim().length > 0;
        }
      }
      return true;
    });
  }, [checklist.items, answers]);
  
  // Keep reference to avoid lint warning
  void _isFormValid;

  return (
    <div className="checklist-container">
      <div className="checklist-header">
        <h3 className="checklist-title">📋 {checklist.title}</h3>
        {checklist.description && (
          <p className="checklist-description">{checklist.description}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="checklist-form">
        <div className="checklist-items">
          {checklist.items.map((item) => (
            <div key={item.id} className="checklist-item">
              <label className="checklist-item-label">
                {item.type === 'boolean' ? (
                  <>
                    <input
                      type="checkbox"
                      checked={answers[item.id] === true}
                      onChange={(e) => handleBooleanChange(item.id, e.target.checked)}
                      disabled={disabled}
                      className="checklist-checkbox"
                    />
                    <span className="checklist-item-text">{item.label}</span>
                    {item.required && <span className="required-mark">*</span>}
                  </>
                ) : item.type === 'number' ? (
                  <>
                    <span className="checklist-item-text">
                      {item.label}
                      {item.required && <span className="required-mark">*</span>}
                    </span>
                    <div className="checklist-number-input-wrapper">
                      <input
                        type="number"
                        min="0"
                        step={item.unit === 'км' ? '0.1' : '1'}
                        value={answers[item.id] as number || 0}
                        onChange={(e) => handleNumberChange(item.id, parseFloat(e.target.value) || 0)}
                        disabled={disabled}
                        className="checklist-number-input"
                        required={item.required}
                      />
                      {item.unit && (
                        <span className="checklist-unit">{item.unit}</span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <span className="checklist-item-text">
                      {item.label}
                      {item.required && <span className="required-mark">*</span>}
                    </span>
                    <input
                      type="text"
                      value={answers[item.id] as string || ''}
                      onChange={(e) => handleTextChange(item.id, e.target.value)}
                      disabled={disabled}
                      className="checklist-text-input"
                      required={item.required}
                      placeholder="Введите ответ..."
                    />
                  </>
                )}
              </label>
            </div>
          ))}
        </div>

        <div className="checklist-actions">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="checklist-cancel-btn"
              disabled={disabled}
            >
              Отмена
            </button>
          )}
          <button
            type="submit"
            className="checklist-submit-btn"
            disabled={disabled}
          >
            ✅ Отправить ответы
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChecklistComponent;

