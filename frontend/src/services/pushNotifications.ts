/**
 * Push Notifications service using Capacitor
 * Works on native platforms (Android/iOS), gracefully degrades on web
 */
import { getApiUrl } from '../config/api';

export interface PushNotificationToken {
  token: string;
  platform: 'android' | 'ios' | 'web';
  deviceId?: string;
}

// Helper to dynamically import modules without TypeScript checking
async function tryImport(moduleName: string): Promise<any> {
  try {
    // Dynamic import for Capacitor modules - only works on native platforms
    // eslint-disable-next-line no-new-func
    const importFn = new Function('moduleName', 'return import(moduleName)');
    return await importFn(moduleName);
  } catch {
    return null;
  }
}

class PushNotificationService {
  private isInitialized = false;
  private currentToken: string | null = null;
  private userId: number | null = null;
  private isNativePlatform = false;
  private Capacitor: any = null;
  private PushNotifications: any = null;

  /**
   * Initialize push notifications
   */
  async initialize(userId: number): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.userId = userId;

    // Try to load Capacitor dynamically
    const capacitorCore = await tryImport('@capacitor/core');
    if (!capacitorCore) {
      console.log('📱 Capacitor not available, push notifications disabled');
      return;
    }

    this.Capacitor = capacitorCore.Capacitor;
    this.isNativePlatform = this.Capacitor?.isNativePlatform?.() || false;

    // Only initialize on native platforms
    if (!this.isNativePlatform) {
      console.log('📱 Push notifications not available on web platform');
      return;
    }

    try {
      // Load push notifications plugin
      const pushModule = await tryImport('@capacitor/push-notifications');
      if (!pushModule) {
        console.log('📱 Push notifications plugin not available');
        return;
      }
      this.PushNotifications = pushModule.PushNotifications;

      // Request permission
      let permStatus = await this.PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await this.PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('⚠️ Push notification permission denied');
        return;
      }

      // Register for push notifications
      await this.PushNotifications.register();

      // Listen for registration
      this.PushNotifications.addListener('registration', async (token: any) => {
        console.log('📱 Push registration success, token:', token.value);
        this.currentToken = token.value;
        await this.registerToken(token.value);
      });

      // Listen for registration errors
      this.PushNotifications.addListener('registrationError', (error: any) => {
        console.error('❌ Push registration error:', error);
      });

      // Listen for push notifications
      this.PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
        console.log('📬 Push notification received:', notification);
        // Handle notification received while app is in foreground
      });

      // Listen for push notification actions
      this.PushNotifications.addListener('pushNotificationActionPerformed', (action: any) => {
        console.log('👆 Push notification action performed:', action);
        // Handle notification tap
        const data = action.notification?.data as { chat_id?: string; goal_id?: string } | undefined;
        if (data?.chat_id) {
          window.location.href = `/chat/${data.chat_id}`;
        } else if (data?.goal_id) {
          window.location.href = `/goals/${data.goal_id}`;
        }
      });

      this.isInitialized = true;
      console.log('✅ Push notifications initialized');
    } catch (error) {
      console.error('❌ Error initializing push notifications:', error);
    }
  }

  /**
   * Register device token with backend
   */
  private async registerToken(token: string): Promise<void> {
    if (!this.userId) {
      console.warn('⚠️ Cannot register token: userId not set');
      return;
    }

    try {
      const platform = this.Capacitor?.getPlatform?.() || 'web';
      const deviceId = await this.getDeviceId();

      const response = await fetch(`${getApiUrl()}/api/push/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: this.userId,
          token: token,
          platform: platform,
          device_id: deviceId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to register token: ${response.statusText}`);
      }

      console.log('✅ Token registered with backend');
    } catch (error) {
      console.error('❌ Error registering token:', error);
    }
  }

  /**
   * Get device ID (for tracking)
   */
  private async getDeviceId(): Promise<string | undefined> {
    try {
      const deviceModule = await tryImport('@capacitor/device');
      if (!deviceModule) return undefined;
      
      const Device = deviceModule.Device;
      const info = await Device.getId();
      return info.identifier;
    } catch (error) {
      console.warn('⚠️ Could not get device ID:', error);
      return undefined;
    }
  }

  /**
   * Unregister device token
   */
  async unregister(): Promise<void> {
    if (!this.currentToken) {
      return;
    }

    try {
      await fetch(`${getApiUrl()}/api/push/unregister/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: this.currentToken,
        }),
      });

      this.currentToken = null;
      console.log('✅ Token unregistered');
    } catch (error) {
      console.error('❌ Error unregistering token:', error);
    }
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.currentToken;
  }

  /**
   * Check if push notifications are available
   */
  isAvailable(): boolean {
    return this.isNativePlatform && this.isInitialized;
  }
}

export const pushNotificationService = new PushNotificationService();
