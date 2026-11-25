import { useState, useEffect, useRef, useCallback } from 'react';
import { createChat, sendMessageStream, formatUserMessage, ChatHistoryItem } from '../services/gemini';
import { parseReply, parseStreaming } from '../utils/parseReply';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useSpeechSynthesis } from './useSpeechSynthesis';

export type ChatStatus = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  mode: 'chat' | 'voice';
  status: 'streaming' | 'done' | 'error';
  createdAt: number;
}

const STORAGE_KEY = 'voice-chat-history';

/**
 * Generates a unique UUID with fallback for older environments.
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'msg-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now();
}

/**
 * Converts stored chat messages into Gemini chat history format.
 */
function buildHistoryFromMessages(messages: ChatMessage[]): ChatHistoryItem[] {
  const history: ChatHistoryItem[] = [];

  for (const msg of messages) {
    if (msg.status === 'error' || !msg.text.trim()) continue;

    if (msg.role === 'user') {
      history.push({
        role: 'user',
        parts: [{ text: formatUserMessage(msg.text, msg.mode) }],
      });
    } else if (msg.role === 'model') {
      history.push({
        role: 'model',
        parts: [{ text: msg.text }],
      });
    }
  }

  return history;
}

export const INITIAL_GREETING: ChatMessage = {
  id: 'greeting-ufill',
  role: 'model',
  text: "Hello! I'm U Fill Acadmey Bot, your AI assistant. How can I help you today? You can type your question or tap the mic on the orb to talk with me.",
  mode: 'chat',
  status: 'done',
  createdAt: Date.now(),
};

export function useVoiceChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [handsFree, setHandsFree] = useState<boolean>(false);
  const [selectedVoice, setSelectedVoice] = useState<string>('adam');

  const chatRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const statusRef = useRef<ChatStatus>('idle');
  statusRef.current = status;

  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  const lastUserPromptRef = useRef<{ text: string; mode: 'chat' | 'voice' } | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const startListeningRef = useRef<() => void>(() => {});
  const abortMicRef = useRef<() => void>(() => {});

  // Initialize Speech Synthesis
  const {
    isSpeaking,
    speak: synthSpeak,
    cancel: synthCancel,
    voices,
    isSupported: isTtsSupported,
  } = useSpeechSynthesis();

  // Forward declarations for mutual dependency
  const handleInterrupt = useCallback(() => {
    // 1. Abort ongoing Gemini stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // 2. Cancel TTS
    synthCancel();

    // 3. Abort microphone if active
    abortMicRef.current();

    // 4. Clean up any lingering "streaming" message
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === 'model' && last.status === 'streaming') {
        if (!last.text.trim()) {
          return prev.slice(0, -1);
        }
        return [
          ...prev.slice(0, -1),
          { ...last, status: 'done' as const },
        ];
      }
      return prev;
    });

    setStatus('idle');
    setError(null);
  }, [synthCancel]);

  // Execute Gemini response flow
  const executeQuery = useCallback(
    async (promptText: string, mode: 'chat' | 'voice') => {
      if (!promptText.trim()) return;

      // Handle barge-in: cancel ongoing speech or stream
      handleInterrupt();

      lastUserPromptRef.current = { text: promptText, mode };

      const userMessageId = generateUUID();
      const modelMessageId = generateUUID();

      const userMessage: ChatMessage = {
        id: userMessageId,
        role: 'user',
        text: promptText,
        mode,
        status: 'done',
        createdAt: Date.now(),
      };

      const emptyModelMessage: ChatMessage = {
        id: modelMessageId,
        role: 'model',
        text: '',
        mode,
        status: 'streaming',
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage, emptyModelMessage]);
      setStatus('thinking');
      setError(null);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        if (!chatRef.current) {
          chatRef.current = createChat();
        }

        let fullRawResponse = '';

        fullRawResponse = await sendMessageStream(
          chatRef.current,
          promptText,
          mode,
          {
            signal: abortController.signal,
            onChunk: (chunkSoFar) => {
              fullRawResponse = chunkSoFar;
              const { display } = parseStreaming(chunkSoFar);

              // Batch UI updates with requestAnimationFrame
              if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
              rafIdRef.current = requestAnimationFrame(() => {
                setMessages((prev) => {
                  return prev.map((msg) =>
                    msg.id === modelMessageId ? { ...msg, text: display } : msg
                  );
                });
              });
            },
          }
        );

        if (abortController.signal.aborted) {
          return;
        }

        const { display, speech } = parseReply(fullRawResponse);
        const finalText = display.trim() || "I couldn't generate a response. Please try again.";

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === modelMessageId
              ? { ...msg, text: finalText, status: 'done' }
              : msg
          )
        );

        // In voice mode, speak the speech text aloud
        if (mode === 'voice' && speech) {
          setStatus('speaking');
          synthSpeak(speech, {
            voice: selectedVoice,
            onEnd: () => {
              setStatus('idle');
              // If hands-free mode is active, resume listening automatically
              if (handsFree) {
                startListeningRef.current();
              }
            },
            onError: () => {
              setStatus('idle');
            },
          });
        } else {
          setStatus('idle');
        }
      } catch (err: any) {
        if (abortController.signal.aborted || err?.name === 'AbortError') {
          return;
        }

        const rawMsg = err?.message || String(err || '');
        let fallbackMsg = rawMsg;

        if (
          rawMsg.includes('503') ||
          rawMsg.includes('UNAVAILABLE') ||
          rawMsg.includes('high demand')
        ) {
          fallbackMsg =
            'Gemini is currently experiencing high demand (503). Please wait a few seconds and click Retry.';
        } else if (
          rawMsg.includes('429') ||
          rawMsg.includes('quota') ||
          rawMsg.includes('RESOURCE_EXHAUSTED') ||
          rawMsg.includes('exceeded your current quota')
        ) {
          fallbackMsg =
            'Gemini API quota exceeded (429). You have hit Google AI Studio’s free tier rate limit. Please wait 30–60 seconds and click Retry, or check your quota at ai.dev/rate-limit.';
        } else if (rawMsg.includes('404') || rawMsg.includes('not found')) {
          fallbackMsg =
            'Model not found (404). Switched to active model. Please click Retry.';
        } else if (rawMsg.includes('API key') || rawMsg.includes('403')) {
          fallbackMsg =
            'Invalid or missing Gemini API key. Please check your NEXT_PUBLIC_GEMINI_API_KEY.';
        } else if (!rawMsg.trim()) {
          fallbackMsg = "I couldn't generate a response. Please try again.";
        }

        // Reset chat session so retry creates a fresh session
        chatRef.current = null;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === modelMessageId
              ? { ...msg, text: fallbackMsg, status: 'error' }
              : msg
          )
        );

        setError(fallbackMsg);
        setStatus('error');
      } finally {
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    },
    [handleInterrupt, synthSpeak, selectedVoice, handsFree]
  );

  // Initialize Speech Recognition
  const {
    isListening,
    interimTranscript,
    start: startMic,
    stop: stopMic,
    abort: abortMic,
    error: micError,
    isSupported: isSttSupported,
  } = useSpeechRecognition({
    lang: 'en-IN',
    onFinalResult: (transcript) => {
      if (transcript.trim()) {
        executeQuery(transcript.trim(), 'voice');
      } else {
        setStatus('idle');
      }
    },
    onError: (err) => {
      setError(err);
      setStatus('error');
    },
  });

  abortMicRef.current = abortMic;

  const startListening = useCallback(() => {
    // Prevent mic while speaking or running
    if (statusRef.current === 'speaking' || isSpeaking) {
      synthCancel();
    }
    if (abortControllerRef.current) {
      handleInterrupt();
    }
    setStatus('listening');
    setError(null);
    startMic();
  }, [isSpeaking, synthCancel, handleInterrupt, startMic]);

  startListeningRef.current = startListening;

  const stopListening = useCallback(() => {
    stopMic();
    if (statusRef.current === 'listening') {
      setStatus('idle');
    }
  }, [stopMic]);

  const sendText = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      if (isListening) {
        abortMic();
      }
      executeQuery(text.trim(), 'chat');
    },
    [isListening, abortMic, executeQuery]
  );

  const retryLast = useCallback(() => {
    if (lastUserPromptRef.current) {
      const { text, mode } = lastUserPromptRef.current;
      executeQuery(text, mode);
    }
  }, [executeQuery]);

  const clearChat = useCallback(() => {
    handleInterrupt();
    abortMic();
    setMessages([INITIAL_GREETING]);
    setError(null);
    setStatus('idle');
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    chatRef.current = createChat();
  }, [handleInterrupt, abortMic]);

  // Restore messages and session history on load
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure U Fill Acadmey Bot greeting is always present as the first message
          const hasGreeting = parsed.some(
            (m) =>
              m.id === 'greeting-ufill' ||
              m.id === 'greeting-nova' ||
              m.text.includes("U Fill Acadmey Bot") ||
              m.text.includes("I'm Nova")
          );
          // If old Nova greeting was in storage, replace it with the new greeting
          const sanitized = parsed.map((m) =>
            m.id === 'greeting-nova' || m.text.includes("I'm Nova")
              ? INITIAL_GREETING
              : m
          );
          const finalMessages = hasGreeting ? sanitized : [INITIAL_GREETING, ...sanitized];
          setMessages(finalMessages);
          const history = buildHistoryFromMessages(finalMessages);
          chatRef.current = createChat({ history });
          return;
        }
      }
    } catch {
      // ignore
    }
    setMessages([INITIAL_GREETING]);
    chatRef.current = createChat();
  }, []);

  // Persist messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } catch {
        // ignore
      }
    }
  }, [messages]);

  // Keep status in sync with speech synthesis speaking state
  useEffect(() => {
    if (isSpeaking && status !== 'speaking') {
      setStatus('speaking');
    } else if (!isSpeaking && status === 'speaking') {
      setStatus('idle');
    }
  }, [isSpeaking, status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
      synthCancel();
      abortMic();
    };
  }, [synthCancel, abortMic]);

  return {
    messages,
    status,
    interimTranscript,
    error: error || micError,
    sendText,
    startListening,
    stopListening,
    stopSpeaking: synthCancel,
    interrupt: handleInterrupt,
    clearChat,
    isVoiceSupported: isSttSupported,
    handsFree,
    setHandsFree,
    retryLast,
    selectedVoice,
    setSelectedVoice,
    voices,
  };
}
