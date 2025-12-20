import { getApiUrl } from '../config/api';

export interface User {
  id: number;
  username: string;
  email?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Goal {
  id: number;
  title: string;
  description?: string;
  user_id: number;
  created_at: string;
  updated_at?: string;
}

export interface Milestone {
  id: number;
  title: string;
  description?: string;
  goal_id: number;
  completed?: boolean; // Optional - may come as is_completed from backend
  is_completed?: boolean; // Backend field name
  target_date?: string | null; // Deadline
  created_at: string;
  updated_at?: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  goal_id: number;
  milestone_id?: number | null;
  due_date?: string | null; // DateTime deadline
  is_completed: boolean;
  priority?: string; // low, medium, high
  created_at: string;
  updated_at?: string;
  completed_at?: string | null;
}

export interface Message {
  id: number;
  content: string;
  chat_id: number;
  sender: 'user' | 'ai';
  timestamp?: string; // Legacy field
  created_at?: string; // Backend field
}

export interface Chat {
  id: number;
  goal_id: number;
  created_at: string;
  updated_at?: string;
}

// Auth token management
const getToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

const setToken = (token: string): void => {
  localStorage.setItem('auth_token', token);
};

const removeToken = (): void => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_id');
};

const getUserId = (): number | null => {
  const userId = localStorage.getItem('user_id');
  return userId ? parseInt(userId, 10) : null;
};

const setUserId = (userId: number): void => {
  localStorage.setItem('user_id', userId.toString());
};

// API request helper
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getToken();
  const url = getApiUrl(endpoint);
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    console.log('API Request:', url, options.method || 'GET', headers);
    const response = await fetch(url, {
      ...options,
      headers,
      mode: 'cors', // Explicitly set CORS mode
    });

    console.log('API Response:', response.status, response.statusText);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { detail: `HTTP ${response.status}: ${response.statusText}` };
      }
      console.error('API Error:', errorData);
      
      // Debug mode: include full error details
      const errorMessage = errorData.detail || errorData.message || `API request failed: ${response.status} ${response.statusText}`;
      const fullError = `HTTP ${response.status} ${response.statusText}\n\nError details: ${JSON.stringify(errorData, null, 2)}\n\nURL: ${url}\nMethod: ${options.method || 'GET'}\nHeaders: ${JSON.stringify(headers, null, 2)}`;
      
      const error = new Error(errorMessage);
      (error as any).fullDetails = fullError;
      (error as any).status = response.status;
      (error as any).responseData = errorData;
      throw error;
    }

    const data = await response.json();
    console.log('API Success:', data);
    return data;
  } catch (err) {
    console.error('API Request Error:', err);
    if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('Failed to fetch'))) {
      throw new Error(`Failed to connect to API at ${url}. Is the backend running at http://localhost:8000? Check CORS settings.`);
    }
    throw err;
  }
};

// Auth API
export const authAPI = {
  login: async (username: string, password: string): Promise<{ access_token: string; token_type: string; user_id?: number }> => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await fetch(getApiUrl('/token'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Invalid credentials' }));
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    setToken(data.access_token);
    if (data.user_id) {
      setUserId(data.user_id);
    }
    return data;
  },

  register: async (username: string, email: string, password: string): Promise<{ access_token: string; token_type: string; user_id?: number }> => {
    const response = await fetch(getApiUrl('/register'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ username, email, password }).toString(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(error.detail || 'Registration failed');
    }

    const data = await response.json();
    setToken(data.access_token);
    if (data.user_id) {
      setUserId(data.user_id);
    }
    return data;
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      const user = await apiRequest<User>('/api/users/me');
      if (user && user.id) {
        setUserId(user.id);
      }
      return user;
    } catch (err) {
      console.error('Failed to get current user:', err);
      return null;
    }
  },

  getUserId: (): number | null => {
    return getUserId();
  },

  logout: (): void => {
    removeToken();
  },

  isAuthenticated: (): boolean => {
    return getToken() !== null;
  },
};

// Goals API
export const goalsAPI = {
  getAll: async (userId: number): Promise<Goal[]> => {
    return apiRequest<Goal[]>(`/api/goals/?user_id=${userId}`);
  },

  getById: async (goalId: number): Promise<Goal> => {
    return apiRequest<Goal>(`/api/goals/${goalId}`);
  },

  create: async (goal: { title: string; description?: string }, userId: number): Promise<Goal> => {
    return apiRequest<Goal>(`/api/goals/?user_id=${userId}`, {
      method: 'POST',
      body: JSON.stringify(goal),
    });
  },

  update: async (goalId: number, goal: { title?: string; description?: string }): Promise<Goal> => {
    return apiRequest<Goal>(`/api/goals/${goalId}`, {
      method: 'PUT',
      body: JSON.stringify(goal),
    });
  },

  delete: async (goalId: number): Promise<void> => {
    await apiRequest<void>(`/api/goals/${goalId}`, {
      method: 'DELETE',
    });
  },
};

// Milestones API
export const milestonesAPI = {
  getByGoalId: async (goalId: number): Promise<Milestone[]> => {
    return apiRequest<Milestone[]>(`/api/milestones/?goal_id=${goalId}`);
  },

  create: async (milestone: { title: string; description?: string; goal_id: number; target_date?: string | null }): Promise<Milestone> => {
    return apiRequest<Milestone>('/api/milestones/', {
      method: 'POST',
      body: JSON.stringify(milestone),
    });
  },

  update: async (milestoneId: number, milestone: { title?: string; completed?: boolean; target_date?: string | null }): Promise<Milestone> => {
    return apiRequest<Milestone>(`/api/milestones/${milestoneId}`, {
      method: 'PUT',
      body: JSON.stringify(milestone),
    });
  },

  delete: async (milestoneId: number): Promise<void> => {
    await apiRequest<void>(`/api/milestones/${milestoneId}`, {
      method: 'DELETE',
    });
  },
};

// Tasks API
export const tasksAPI = {
  getByGoalId: async (goalId: number, is_completed?: boolean): Promise<Task[]> => {
    const params = new URLSearchParams({ goal_id: String(goalId) });
    if (is_completed !== undefined) {
      params.append('is_completed', String(is_completed));
    }
    return apiRequest<Task[]>(`/api/tasks/?${params.toString()}`);
  },
  getUpcoming: async (goalId: number, limit: number = 5): Promise<Task[]> => {
    return apiRequest<Task[]>(`/api/tasks/?goal_id=${goalId}&is_completed=false&limit=${limit}`);
  },
  create: async (task: { title: string; description?: string; goal_id: number; milestone_id?: number; due_date?: string; priority?: string }): Promise<Task> => {
    return apiRequest<Task>(`/api/tasks/`, {
      method: 'POST',
      body: JSON.stringify(task),
    });
  },
  update: async (id: number, updates: Partial<Task>): Promise<Task> => {
    return apiRequest<Task>(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },
  delete: async (id: number): Promise<void> => {
    await apiRequest(`/api/tasks/${id}`, {
      method: 'DELETE',
    });
  },
};

// Chats API
export const chatsAPI = {
  getByGoalId: async (goalId: number): Promise<Chat[]> => {
    return apiRequest<Chat[]>(`/api/chats/?goal_id=${goalId}`);
  },

  create: async (chat: { goal_id: number }): Promise<Chat> => {
    return apiRequest<Chat>('/api/chats/', {
      method: 'POST',
      body: JSON.stringify(chat),
    });
  },

  getMessages: async (chatId: number): Promise<Message[]> => {
    return apiRequest<Message[]>(`/api/chats/${chatId}/messages/`);
  },

  sendMessage: async (chatId: number, content: string, sender: 'user' | 'ai', debugMode: boolean = false): Promise<Message> => {
    const url = `/api/chats/${chatId}/messages/?debug_mode=${debugMode}`;
    const message = await apiRequest<Message>(url, {
      method: 'POST',
      body: JSON.stringify({ content, sender }),
    });
    
    // If user message, wait a bit and fetch new messages to get AI response
    if (sender === 'user') {
      // AI response will be created automatically by backend
      return message;
    }
    
    return message;
  },
};

// AI API for direct chat
export const aiAPI = {
  chat: async (messages: Array<{ role: string; content: string }>, goalId?: number): Promise<{ message: string; action?: string; data?: any }> => {
    return apiRequest<{ message: string; action?: string; data?: any }>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, goal_id: goalId }),
    });
  },
};

