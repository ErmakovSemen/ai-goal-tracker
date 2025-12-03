import React, { useState } from 'react';
import './DebugMenu.css';

export interface DebugSettings {
  enabled: boolean;
  showRawResponse: boolean;
  parseJson: boolean;
  executeActions: boolean;
}

interface DebugMenuProps {
  settings: DebugSettings;
  onSettingsChange: (settings: DebugSettings) => void;
  onClose: () => void;
}

const DebugMenu: React.FC<DebugMenuProps> = ({ settings, onSettingsChange, onClose }) => {
  const [localSettings, setLocalSettings] = useState<DebugSettings>(settings);

  const handleChange = (key: keyof DebugSettings, value: boolean) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  return (
    <div className="debug-menu-overlay" onClick={onClose}>
      <div className="debug-menu" onClick={(e) => e.stopPropagation()}>
        <div className="debug-menu-header">
          <h3>🐛 Debug Settings</h3>
          <button className="debug-menu-close" onClick={onClose}>×</button>
        </div>
        <div className="debug-menu-content">
          <div className="debug-menu-item">
            <label>
              <input
                type="checkbox"
                checked={localSettings.enabled}
                onChange={(e) => handleChange('enabled', e.target.checked)}
              />
              <span>Enable Debug Mode</span>
            </label>
            <p className="debug-menu-description">Show debug information in chat</p>
          </div>

          <div className="debug-menu-item">
            <label>
              <input
                type="checkbox"
                checked={localSettings.showRawResponse}
                onChange={(e) => handleChange('showRawResponse', e.target.checked)}
                disabled={!localSettings.enabled}
              />
              <span>Show Raw AI Response</span>
            </label>
            <p className="debug-menu-description">Display the raw response from AI as-is</p>
          </div>

          <div className="debug-menu-item">
            <label>
              <input
                type="checkbox"
                checked={localSettings.parseJson}
                onChange={(e) => handleChange('parseJson', e.target.checked)}
                disabled={!localSettings.enabled}
              />
              <span>Parse JSON Actions</span>
            </label>
            <p className="debug-menu-description">Try to parse JSON and extract actions</p>
          </div>

          <div className="debug-menu-item">
            <label>
              <input
                type="checkbox"
                checked={localSettings.executeActions}
                onChange={(e) => handleChange('executeActions', e.target.checked)}
                disabled={!localSettings.enabled || !localSettings.parseJson}
              />
              <span>Execute Actions (Create Milestones)</span>
            </label>
            <p className="debug-menu-description">Automatically create milestones from parsed actions</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugMenu;

