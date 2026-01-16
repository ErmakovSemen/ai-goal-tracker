import React, { useState, useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { ApkInstaller } from '../plugins/apkInstaller';
import { fetchLatestRelease } from '../services/devBuilds';
import { useI18n } from '../i18n';
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
  const { t } = useI18n();
  const [localSettings, setLocalSettings] = useState<DebugSettings>(settings);
  const [debugEnabled, setDebugEnabled] = useState<boolean>(() => {
    return localStorage.getItem('debug_mode_enabled') === 'true';
  });
  const [appVersion, setAppVersion] = useState<string>('web');
  const [appBuild, setAppBuild] = useState<string>('N/A');
  const [latestStatus, setLatestStatus] = useState<string | null>(null);
  const [latestError, setLatestError] = useState<string | null>(null);
  const [canInstall, setCanInstall] = useState<boolean | null>(null);

  useEffect(() => {
    const loadAppInfo = async () => {
      try {
        if (Capacitor.getPlatform() !== 'web') {
          const info = await CapacitorApp.getInfo();
          setAppVersion(info.version || 'N/A');
          setAppBuild(info.build || 'N/A');
        }
      } catch (err) {
        // ignore
      }
    };
    loadAppInfo();
  }, []);

  const handleChange = (key: keyof DebugSettings, value: boolean) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleToggleDebug = () => {
    const next = !debugEnabled;
    setDebugEnabled(next);
    localStorage.setItem('debug_mode_enabled', String(next));
  };

  const handleUpdateLatest = async () => {
    setLatestError(null);
    setLatestStatus(t('loading'));

    if (Capacitor.getPlatform() !== 'android') {
      setLatestStatus(null);
      setLatestError(t('android_only'));
      return;
    }

    try {
      setLatestStatus(t('fetching_latest'));
      const latest = await fetchLatestRelease();
      if (!latest.apk) {
        throw new Error('APK not found in latest release');
      }

      const installCheck = await ApkInstaller.canInstall();
      setCanInstall(installCheck.canInstall);
      if (!installCheck.canInstall) {
        setLatestStatus(null);
        setLatestError(t('allow_unknown_sources'));
        return;
      }

      setLatestStatus(t('downloading'));
      await ApkInstaller.downloadAndInstall({ url: latest.apk.url, fileName: latest.apk.name });
      setLatestStatus(t('ready_to_install'));
    } catch (err: any) {
      setLatestStatus(null);
      setLatestError(err?.message || t('update_failed'));
    }
  };

  const handleOpenInstallSettings = async () => {
    try {
      await ApkInstaller.openInstallSettings();
    } catch (err) {
      // ignore
    }
  };

  return (
    <div className="debug-menu-overlay" onClick={onClose}>
      <div className="debug-menu" onClick={(e) => e.stopPropagation()}>
        <div className="debug-menu-header">
          <h3>🐛 {t('debug_title')}</h3>
          <button className="debug-menu-close" onClick={onClose}>×</button>
        </div>
        <div className="debug-menu-content">
          {/* Debug Mode Toggle */}
          <div className="debug-menu-item">
            <div className="debug-toggle-section">
              <label className="debug-toggle-label">{t('debug_title')}</label>
              <label className="debug-toggle">
                <input
                  type="checkbox"
                  checked={debugEnabled}
                  onChange={handleToggleDebug}
                />
                <span className="debug-toggle-slider" />
              </label>
            </div>
            <p className="debug-menu-description">{t('stats_locked')}</p>
          </div>

          {/* App Version */}
          <div className="debug-menu-item">
            <div className="debug-info-row">
              <span className="debug-label">{t('version_label')}</span>
              <span className="debug-value">{appVersion} ({appBuild})</span>
            </div>
          </div>

          {/* Update to Latest */}
          {Capacitor.getPlatform() === 'android' && (
            <div className="debug-menu-item">
              <button className="update-latest-button" onClick={handleUpdateLatest}>
                {t('update_latest')}
              </button>
              {latestStatus && <div className="debug-status">{latestStatus}</div>}
              {latestError && (
                <div className="debug-error">
                  {latestError}
                  {canInstall === false && (
                    <button className="debug-link" onClick={handleOpenInstallSettings}>
                      {t('open_settings')}
                    </button>
                  )}
                </div>
              )}
              <div className="debug-hint">{t('restart_after_install')}</div>
            </div>
          )}

          <div className="debug-menu-divider" />

          {/* Chat Debug Settings */}
          <div className="debug-menu-item">
            <label>
              <input
                type="checkbox"
                checked={localSettings.enabled}
                onChange={(e) => handleChange('enabled', e.target.checked)}
              />
              <span>Enable Chat Debug Mode</span>
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

