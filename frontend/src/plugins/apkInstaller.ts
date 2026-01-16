import { registerPlugin } from '@capacitor/core';

export interface ApkInstallerPlugin {
  canInstall(): Promise<{ canInstall: boolean }>;
  openInstallSettings(): Promise<void>;
  downloadAndInstall(options: { url: string; fileName?: string }): Promise<void>;
}

export const ApkInstaller = registerPlugin<ApkInstallerPlugin>('ApkInstaller');
