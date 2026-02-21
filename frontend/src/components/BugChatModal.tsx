import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { sendBugPhoto, sendBugText } from '../services/bugChatApi';
import {
  BugChatAttachment,
  BugChatMessage,
  loadBugChatHistory,
  saveBugChatHistory,
} from '../services/bugChatStorage';
import { sha256 } from '../services/hash';
import './BugChatModal.css';

interface BugChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;
  return 'Не удалось отправить сообщение. Попробуйте еще раз.';
};

const BugChatModal: React.FC<BugChatModalProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n();
  const [messages, setMessages] = useState<BugChatMessage[]>(() => loadBugChatHistory());
  const [text, setText] = useState('');
  const [draftFiles, setDraftFiles] = useState<File[]>([]);
  const [draftAttachments, setDraftAttachments] = useState<BugChatAttachment[]>([]);
  const [fileBuckets, setFileBuckets] = useState<Record<string, File[]>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const reattachInputRef = useRef<HTMLInputElement | null>(null);
  const [reattachTargetId, setReattachTargetId] = useState<string | null>(null);

  const statusLabel = useMemo(() => ({
    queued: t('bug_chat_status_queued'),
    sending: t('bug_chat_status_sending'),
    sent: t('bug_chat_status_sent'),
    error: t('bug_chat_status_error'),
  }), [t]);

  const persistMessages = (next: BugChatMessage[]) => {
    setMessages(next);
    saveBugChatHistory(next);
  };

  const updateMessage = (id: string, updater: (message: BugChatMessage) => BugChatMessage) => {
    setMessages((prev) => {
      const next = prev.map((message) => (message.id === id ? updater(message) : message));
      saveBugChatHistory(next);
      return next;
    });
  };

  const revokeAttachmentPreviews = (attachments: BugChatAttachment[]) => {
    attachments.forEach((attachment) => {
      if (attachment.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    });
  };

  const clearDraft = () => {
    revokeAttachmentPreviews(draftAttachments);
    setDraftFiles([]);
    setDraftAttachments([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const makeAttachments = (files: File[]): BugChatAttachment[] => {
    return files.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      previewUrl: URL.createObjectURL(file),
    }));
  };

  const processTextMessage = async (messageId: string, messageText: string) => {
    updateMessage(messageId, (message) => ({ ...message, status: 'sending', errorMessage: undefined }));
    try {
      const textHash = await sha256(messageText);
      updateMessage(messageId, (message) => ({ ...message, textHash }));
      await sendBugText(messageText);
      updateMessage(messageId, (message) => ({ ...message, status: 'sent', errorMessage: undefined }));
    } catch (error) {
      updateMessage(messageId, (message) => ({
        ...message,
        status: 'error',
        errorMessage: toErrorMessage(error),
        retryCount: message.retryCount + 1,
      }));
    }
  };

  const processPhotoMessage = async (messageId: string, files: File[], caption?: string) => {
    updateMessage(messageId, (message) => ({ ...message, status: 'sending', errorMessage: undefined }));
    try {
      for (const file of files) {
        await sendBugPhoto(file, caption);
      }
      updateMessage(messageId, (message) => ({ ...message, status: 'sent', errorMessage: undefined }));
    } catch (error) {
      updateMessage(messageId, (message) => ({
        ...message,
        status: 'error',
        errorMessage: toErrorMessage(error),
        retryCount: message.retryCount + 1,
      }));
    }
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    const hasText = trimmed.length > 0;
    const hasPhotos = draftAttachments.length > 0;
    if (!hasText && !hasPhotos) return;

    const newMessages: BugChatMessage[] = [];
    let textMessageId: string | null = null;
    let photoMessageId: string | null = null;
    let photoFiles: File[] = [];

    if (hasText) {
      const textMessage: BugChatMessage = {
        id: generateId(),
        kind: 'text',
        text: trimmed,
        createdAt: new Date().toISOString(),
        status: 'queued',
        retryCount: 0,
      };
      textMessageId = textMessage.id;
      newMessages.push(textMessage);
    }

    if (hasPhotos) {
      photoMessageId = generateId();
      if (draftFiles.length > 0) {
        const photoMessage: BugChatMessage = {
          id: photoMessageId,
          kind: 'photo',
          attachments: draftAttachments,
          createdAt: new Date().toISOString(),
          status: 'queued',
          retryCount: 0,
        };
        photoFiles = [...draftFiles];
        newMessages.push(photoMessage);
      }
    }

    if (newMessages.length > 0) {
      persistMessages([...messages, ...newMessages]);
    }

    if (textMessageId) {
      setText('');
      void processTextMessage(textMessageId, trimmed);
    }

    if (photoMessageId && photoFiles.length > 0) {
      setFileBuckets((prev) => ({ ...prev, [photoMessageId as string]: photoFiles }));
      clearDraft();
      void processPhotoMessage(photoMessageId, photoFiles, hasText ? trimmed : undefined);
    }
  };

  const handleDraftFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    if (selected.length === 0) return;

    clearDraft();
    const attachments = makeAttachments(selected);
    setDraftFiles(selected);
    setDraftAttachments(attachments);
  };

  const handleRetry = (message: BugChatMessage) => {
    if (message.kind === 'text' && message.text) {
      void processTextMessage(message.id, message.text);
      return;
    }

    const files = fileBuckets[message.id];
    if (message.kind === 'photo' && files && files.length > 0) {
      void processPhotoMessage(message.id, files);
      return;
    }

    setReattachTargetId(message.id);
    reattachInputRef.current?.click();
  };

  const handleReattachFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const targetId = reattachTargetId;
    const files = Array.from(event.target.files || []);
    if (!targetId || files.length === 0) return;

    const attachments = makeAttachments(files);
    updateMessage(targetId, (message) => {
      if (message.attachments) {
        revokeAttachmentPreviews(message.attachments);
      }
      return {
        ...message,
        attachments,
        errorMessage: undefined,
        status: 'queued',
      };
    });
    setFileBuckets((prev) => ({ ...prev, [targetId]: files }));
    setReattachTargetId(null);
    if (reattachInputRef.current) {
      reattachInputRef.current.value = '';
    }
    void processPhotoMessage(targetId, files);
  };

  const removeDraftAttachment = (index: number) => {
    setDraftAttachments((prev) => {
      const target = prev[index];
      if (target?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, idx) => idx !== index);
    });
    setDraftFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  useEffect(() => {
    return () => {
      revokeAttachmentPreviews(draftAttachments);
      messages.forEach((message) => {
        if (message.attachments) {
          revokeAttachmentPreviews(message.attachments);
        }
      });
    };
    // Intentional one-time cleanup on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isOpen) return null;

  return (
    <div className="bug-chat-overlay" onClick={onClose} role="presentation">
      <div className="bug-chat-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="bug-chat-header">
          <h2>{t('bug_chat_title')}</h2>
          <button type="button" onClick={onClose} aria-label={t('bug_chat_close')}>✕</button>
        </div>

        <div className="bug-chat-history">
          {messages.length === 0 ? (
            <div className="bug-chat-empty">{t('bug_chat_empty')}</div>
          ) : (
            messages.map((message) => {
              const hasRuntimeFiles = Boolean(fileBuckets[message.id]?.length);
              return (
                <div key={message.id} className={`bug-chat-message ${message.status}`}>
                  <div className="bug-chat-message-meta">
                    <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
                    <span>{statusLabel[message.status]}</span>
                  </div>
                  {message.text && <div className="bug-chat-message-text">{message.text}</div>}
                  {message.textHash && <div className="bug-chat-hash">SHA-256: {message.textHash}</div>}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="bug-chat-attachments">
                      {message.attachments.map((attachment, idx) => (
                        <div key={`${attachment.name}-${idx}`} className="bug-chat-attachment-preview">
                          {attachment.previewUrl ? (
                            <img src={attachment.previewUrl} alt={attachment.name} />
                          ) : (
                            <div className="bug-chat-attachment-placeholder">
                              {t('bug_chat_preview_unavailable')}
                            </div>
                          )}
                          <span>{attachment.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {message.status === 'error' && (
                    <div className="bug-chat-error-line">
                      <div>{message.errorMessage}</div>
                      <button type="button" onClick={() => handleRetry(message)}>
                        {message.kind === 'photo' && !hasRuntimeFiles ? t('bug_chat_reattach') : t('bug_chat_retry')}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {draftAttachments.length > 0 && (
          <div className="bug-chat-draft-attachments">
            {draftAttachments.map((attachment, idx) => (
              <div key={`${attachment.name}-${idx}`} className="bug-chat-draft-item">
                {attachment.previewUrl && <img src={attachment.previewUrl} alt={attachment.name} />}
                <span>{attachment.name}</span>
                <button type="button" onClick={() => removeDraftAttachment(idx)}>×</button>
              </div>
            ))}
          </div>
        )}

        <div className="bug-chat-composer">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t('bug_chat_placeholder')}
            rows={3}
          />
          <div className="bug-chat-actions">
            <button type="button" onClick={() => fileInputRef.current?.click()}>
              {t('bug_chat_attach')}
            </button>
            <button type="button" className="primary" onClick={handleSend}>
              {t('bug_chat_send')}
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={handleDraftFilesSelected}
        />
        <input
          ref={reattachInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={handleReattachFiles}
        />
      </div>
    </div>
  );
};

export default BugChatModal;

