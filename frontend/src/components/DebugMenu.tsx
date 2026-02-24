import React, { useState, useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { ApkInstaller } from '../plugins/apkInstaller';
import { fetchLatestRelease, fetchReleasesList, type ReleaseListItem } from '../services/devBuilds';
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
  const [buildsList, setBuildsList] = useState<ReleaseListItem[] | null>(null);
  const [buildsLoading, setBuildsLoading] = useState(false);
  const [buildsError, setBuildsError] = useState<string | null>(null);
  const [installingTag, setInstallingTag] = useState<string | null>(null);

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

  const handleLoadBuilds = async () => {
    if (Capacitor.getPlatform() !== 'android') return;
    setBuildsError(null);
    setBuildsLoading(true);
    setBuildsList(null);
    try {
      const list = await fetchReleasesList();
      setBuildsList(list);
    } catch (err: any) {
      setBuildsError(err?.message || 'Failed to load builds');
    } finally {
      setBuildsLoading(false);
    }
  };

  const handleInstallBuild = async (release: ReleaseListItem) => {
    if (Capacitor.getPlatform() !== 'android') return;
    setInstallingTag(release.tag);
    setBuildsError(null);
    try {
      const installCheck = await ApkInstaller.canInstall();
      setCanInstall(installCheck.canInstall);
      if (!installCheck.canInstall) {
        setBuildsError(t('allow_unknown_sources'));
        return;
      }
      await ApkInstaller.downloadAndInstall({
        url: release.apk.url,
        fileName: release.apk.name,
      });
    } catch (err: any) {
      setBuildsError(err?.message || t('update_failed'));
    } finally {
      setInstallingTag(null);
    }
  };

  const formatReleaseDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return iso;
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

          {/* Choose build from Git */}
          {Capacitor.getPlatform() === 'android' && (
            <div className="debug-menu-item">
              <div className="build-picker-label">{t('choose_build')}</div>
              <button
                type="button"
                className="build-load-button"
                onClick={handleLoadBuilds}
                disabled={buildsLoading}
              >
                {buildsLoading ? t('loading_builds') : t('load_builds')}
              </button>
              {buildsError && (
                <div className="debug-error">
                  {buildsError}
                  {canInstall === false && (
                    <button className="debug-link" onClick={handleOpenInstallSettings}>
                      {t('open_settings')}
                    </button>
                  )}
                </div>
              )}
              {buildsList && (
                <div className="build-list">
                  <div className="build-list-hint">{t('select_build')}</div>
                  {buildsList.length === 0 ? (
                    <div className="build-list-empty">{t('no_builds')}</div>
                  ) : (
                    buildsList.map((r) => (
                      <div key={r.tag} className="build-item">
                        <div className="build-item-info">
                          <span className="build-item-tag">{r.tag}</span>
                          <span className="build-item-name">{r.name}</span>
                          <span className="build-item-date">{formatReleaseDate(r.publishedAt)}</span>
                        </div>
                        <button
                          type="button"
                          className="build-item-install"
                          onClick={() => handleInstallBuild(r)}
                          disabled={installingTag !== null}
                        >
                          {installingTag === r.tag ? t('installing_build') : t('install_build')}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
              {buildsList && buildsList.length > 0 && (
                <div className="debug-hint">{t('restart_after_install')}</div>
              )}
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

