import { getApiUrl } from '../config/api';

export interface User {
  id: number;
  username: string;
  email: string;
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
  login: async (username: string, password: string): Promise<{ access_token: string; token_type: string }> => {
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
    return data;
  },

  logout: (): void => {
    removeToken();
  },

  register: async (username: string, email: string, password: string): Promise<User> => {
    return apiRequest<User>('/api/users/', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
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

  create: async (milestone: { title: string; description?: string; goal_id: number }): Promise<Milestone> => {
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

