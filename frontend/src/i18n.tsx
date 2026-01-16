import React, { createContext, useContext, useMemo, useState } from 'react';

export type Locale = 'en' | 'ru';

const STORAGE_KEY = 'app_locale';

const translations = {
  en: {
    nav_home: 'Home',
    nav_chat: 'Chat',
    nav_profile: 'Profile',
    goals: 'Goals',
    new_goal: 'New goal',
    create_goal_with_ai: 'Create goal with AI or manually',
    no_goals: 'No goals yet',
    delete_goal_title: 'Delete goal',
    delete_goal_confirm: 'Delete goal "{title}"? This action cannot be undone.',
    expand: 'Expand',
    collapse: 'Collapse',
    welcome_title: 'Welcome!',
    welcome_subtitle: 'Your progress today',
    no_goals_title: 'You have no goals yet',
    no_goals_subtitle: 'Create your first goal and start your journey!',
    nearest_deadlines: 'Nearest deadlines',
    login_title: 'Login',
    register_title: 'Register',
    username_label: 'Username',
    email_label: 'Email',
    password_label: 'Password',
    login_button: 'Sign in',
    register_button: 'Sign up',
    login_loading: 'Signing in...',
    register_loading: 'Signing up...',
    toggle_to_register: 'No account? Register',
    toggle_to_login: 'Already have an account? Sign in',
    continue_as_guest: 'Continue without registration',
    back: 'Back',
    profile_title: 'Profile',
    stats_title: 'Statistics',
    stats_goals: 'Goals',
    stats_milestones: 'Milestones',
    stats_tasks: 'Tasks',
    stats_streak: 'Days in a row',
    stats_locked: 'Statistics are available after registration',
    register_cta: 'Register',
    settings_title: 'Settings',
    settings_notifications: 'Notifications',
    settings_theme: 'Dark mode',
    settings_security: 'Security',
    about_title: 'About',
    about_app_name: 'AI Goal Tracker',
    about_version: 'Version 1.0.0',
    about_description: 'Smart goal tracking with AI',
    logout: 'Sign out',
    loading: 'Loading...',
    profile_unavailable: 'Profile temporarily unavailable (update v2)',
    profile_guest: 'Guest',
    quick_goal_title: 'New goal',
    goal_title_label: 'Goal title *',
    goal_title_placeholder: 'e.g. Learn Spanish',
    goal_description_label: 'Description (optional)',
    goal_description_placeholder: 'Details, motivation, timeline...',
    cancel: 'Cancel',
    create_goal: 'Create goal',
    creating: 'Creating...',
    create_plan: 'Create Plan',
    no_milestones: 'No milestones yet',
    chat_empty_title: 'Welcome to AI Goal Tracker',
    chat_empty_subtitle: 'Select a goal from the left to start chatting, or create a new goal to get started!',
    loading_progress: 'Loading progress...',
    tasks_label: 'tasks',
    nearest_deadline: 'Nearest deadline:',
    task_label: 'task',
    milestone_label: 'milestone',
    ai_thinking: 'AI is thinking...',
    debug_title: 'Debug / Dev builds',
    version_label: 'Version',
    update_latest: 'Update to latest',
    android_only: 'Android only',
    fetching_latest: 'Fetching latest build...',
    downloading: 'Downloading...',
    ready_to_install: 'Ready to install',
    update_failed: 'Update failed',
    allow_unknown_sources: 'Please allow installs from unknown sources',
    open_settings: 'Open settings',
    restart_after_install: 'After install, restart the app.',
    language_label: 'Language',
    guest_profile_notice: 'Sign up to unlock full profile features',
    enter_goal_name: 'Enter goal title',
    goal_create_error: 'Error creating goal',
    invalid_email: 'Please enter a valid email',
    password_too_short: 'Password must be at least 6 characters',
    register_failed: 'Registration failed',
    login_failed: 'Invalid username or password',
    goal_tip: 'After creating, you can add milestones and discuss the plan with AI',
  },
  ru: {
    nav_home: 'Главная',
    nav_chat: 'Общение',
    nav_profile: 'Профиль',
    goals: 'Цели',
    new_goal: 'Новая цель',
    create_goal_with_ai: 'Создать цель с AI или вручную',
    no_goals: 'Пока нет целей',
    delete_goal_title: 'Удалить цель',
    delete_goal_confirm: 'Удалить цель "{title}"? Это действие нельзя отменить.',
    expand: 'Развернуть',
    collapse: 'Свернуть',
    welcome_title: 'Добро пожаловать!',
    welcome_subtitle: 'Твой прогресс сегодня',
    no_goals_title: 'У вас пока нет целей',
    no_goals_subtitle: 'Создайте первую цель и начните свой путь к успеху!',
    nearest_deadlines: 'Ближайшие дедлайны',
    login_title: 'Вход',
    register_title: 'Регистрация',
    username_label: 'Имя пользователя',
    email_label: 'Email',
    password_label: 'Пароль',
    login_button: 'Войти',
    register_button: 'Зарегистрироваться',
    login_loading: 'Вход...',
    register_loading: 'Регистрация...',
    toggle_to_register: 'Нет аккаунта? Зарегистрироваться',
    toggle_to_login: 'Уже есть аккаунт? Войти',
    continue_as_guest: 'Продолжить без регистрации',
    back: 'Назад',
    profile_title: 'Профиль',
    stats_title: 'Статистика',
    stats_goals: 'Целей',
    stats_milestones: 'Подцелей',
    stats_tasks: 'Задач',
    stats_streak: 'Дней подряд',
    stats_locked: 'Статистика доступна после регистрации',
    register_cta: 'Зарегистрироваться',
    settings_title: 'Настройки',
    settings_notifications: 'Уведомления',
    settings_theme: 'Темная тема',
    settings_security: 'Безопасность',
    about_title: 'О приложении',
    about_app_name: 'AI Goal Tracker',
    about_version: 'Версия 1.0.0',
    about_description: 'Умный помощник для достижения целей с искусственным интеллектом',
    logout: 'Выйти из аккаунта',
    loading: 'Загрузка...',
    profile_unavailable: 'Профиль временно недоступен (обновление v2)',
    profile_guest: 'Гость',
    quick_goal_title: 'Новая цель',
    goal_title_label: 'Название цели *',
    goal_title_placeholder: 'Например: Выучить испанский',
    goal_description_label: 'Описание (опционально)',
    goal_description_placeholder: 'Подробности о цели, мотивация, сроки...',
    cancel: 'Отмена',
    create_goal: 'Создать цель',
    creating: 'Создание...',
    create_plan: 'Создать план',
    no_milestones: 'Подцелей пока нет',
    chat_empty_title: 'Добро пожаловать в AI Goal Tracker',
    chat_empty_subtitle: 'Выберите цель слева, чтобы начать диалог, или создайте новую цель!',
    loading_progress: 'Загружаем прогресс...',
    tasks_label: 'задач',
    nearest_deadline: 'Ближайший дедлайн:',
    task_label: 'задача',
    milestone_label: 'подцель',
    ai_thinking: 'AI думает...',
    debug_title: 'Debug / Dev builds',
    version_label: 'Версия',
    update_latest: 'Обновиться до последней версии',
    android_only: 'Только Android',
    fetching_latest: 'Ищу последнюю сборку...',
    downloading: 'Скачиваю...',
    ready_to_install: 'Готово к установке',
    update_failed: 'Ошибка обновления',
    allow_unknown_sources: 'Разрешите установку из неизвестных источников',
    open_settings: 'Открыть настройки',
    restart_after_install: 'После установки перезапустите приложение.',
    language_label: 'Язык',
    guest_profile_notice: 'Зарегистрируйтесь, чтобы открыть полный профиль',
    enter_goal_name: 'Введите название цели',
    goal_create_error: 'Ошибка при создании цели',
    invalid_email: 'Пожалуйста, введите корректный email',
    password_too_short: 'Пароль должен быть не менее 6 символов',
    register_failed: 'Не удалось зарегистрироваться',
    login_failed: 'Неверный логин или пароль',
    goal_tip: 'После создания вы сможете добавить подцели и обсудить план с AI',
  },
} as const;

type TranslationKey = keyof typeof translations.en;

const I18nContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
} | null>(null);

const interpolate = (template: string, vars?: Record<string, string | number>) => {
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template
  );
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const stored = (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)) as Locale | null;
  const initialLocale: Locale = stored === 'ru' || stored === 'en' ? stored : 'en';
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, nextLocale);
    }
  };

  const value = useMemo(() => {
    const t = (key: TranslationKey, vars?: Record<string, string | number>) => {
      const table = translations[locale] || translations.en;
      const template = table[key] || translations.en[key] || key;
      return interpolate(template, vars);
    };
    return { locale, setLocale, t };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
};
