export type BugChatStatus = 'queued' | 'sending' | 'sent' | 'error';

export interface BugChatAttachment {
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
}

export interface BugChatMessage {
  id: string;
  kind: 'text' | 'photo';
  text?: string;
  textHash?: string;
  attachments?: BugChatAttachment[];
  createdAt: string;
  status: BugChatStatus;
  errorMessage?: string;
  retryCount: number;
}

const STORAGE_KEY = 'bug_chat_history_v1';
const HISTORY_LIMIT = 100;

const stripTransientFields = (message: BugChatMessage): BugChatMessage => {
  if (!message.attachments || message.attachments.length === 0) {
    return message;
  }

  return {
    ...message,
    attachments: message.attachments.map((attachment) => ({
      name: attachment.name,
      size: attachment.size,
      type: attachment.type,
    })),
  };
};

const trimHistory = (messages: BugChatMessage[]): BugChatMessage[] => {
  if (messages.length <= HISTORY_LIMIT) return messages;
  return messages.slice(messages.length - HISTORY_LIMIT);
};

export const loadBugChatHistory = (): BugChatMessage[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BugChatMessage[];
    return Array.isArray(parsed) ? trimHistory(parsed) : [];
  } catch (err) {
    console.warn('Failed to load bug chat history:', err);
    return [];
  }
};

export const saveBugChatHistory = (messages: BugChatMessage[]): void => {
  if (typeof window === 'undefined') return;

  const normalized = trimHistory(messages).map(stripTransientFields);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
};

