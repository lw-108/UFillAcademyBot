// For production, move this call to a backend endpoint so the API key is not exposed in the browser.
// The code is structured so transport can be swapped for a fetch("/api/chat") call by changing only this file.

import { GoogleGenAI } from '@google/genai';
import { SYSTEM_PROMPT } from '../systemPrompt';

/**
 * Valid Gemini model constant.
 * gemini-3.5-flash-lite is responsive, lightweight, and actively supported without 503/404.
 */
export const MODEL_NAME = 'gemini-3.5-flash-lite';
export const FALLBACK_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
];
export const ENABLE_SEARCH = false;

/**
 * Retrieves the Gemini API key from environment variables.
 */
function getApiKey(): string {
  const key =
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    '';
  if (!key) {
    console.warn('Gemini API key is missing. Ensure NEXT_PUBLIC_GEMINI_API_KEY is defined.');
  }
  return key;
}

/**
 * Creates and initializes a GoogleGenAI client.
 */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = getApiKey();
  return new GoogleGenAI({ apiKey });
}

export interface ChatHistoryItem {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export interface CreateChatOptions {
  history?: ChatHistoryItem[];
  model?: string;
}

/**
 * Factory creating a stateful Gemini chat session with system prompt and search tool.
 */
export function createChat(options: CreateChatOptions = {}) {
  const ai = getGeminiClient();
  const model = options.model || MODEL_NAME;

  const tools = ENABLE_SEARCH ? [{ googleSearch: {} }] : [];

  return ai.chats.create({
    model,
    history: options.history || [],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.3,
      topP: 0.9,
      maxOutputTokens: 1500,
      tools,
    },
  });
}

export interface SendMessageStreamOptions {
  signal?: AbortSignal;
  onChunk?: (fullTextSoFar: string) => void;
}

/**
 * Helper to check if an error is a transient network or rate limit error (429, 500, 503).
 */
function isTransientError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error);
  const status = error.status || error.code;
  return (
    status === 429 ||
    status === 500 ||
    status === 503 ||
    msg.includes('429') ||
    msg.includes('500') ||
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('ResourceExhausted') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('quota') ||
    msg.includes('high demand')
  );
}

/**
 * Formats user message with required mode tag.
 */
export function formatUserMessage(text: string, mode: 'chat' | 'voice'): string {
  return `[MODE: ${mode}] ${text}`;
}

/**
 * Sends a message and consumes the response stream, calling onChunk progressively.
 * Retries once on transient errors (429, 500, 503) and supports cancellation via AbortSignal.
 */
export async function sendMessageStream(
  chat: any,
  text: string,
  mode: 'chat' | 'voice',
  options: SendMessageStreamOptions = {}
): Promise<string> {
  const { signal, onChunk } = options;
  const formattedMessage = formatUserMessage(text, mode);

  const attemptStream = async (): Promise<string> => {
    let accumulatedText = '';
    const responseStream = await chat.sendMessageStream({ message: formattedMessage });

    for await (const chunk of responseStream) {
      if (signal?.aborted) {
        throw new DOMException('Operation aborted by user', 'AbortError');
      }

      const chunkText = chunk.text || '';
      accumulatedText += chunkText;

      if (onChunk) {
        onChunk(accumulatedText);
      }
    }

    return accumulatedText;
  };

  try {
    return await attemptStream();
  } catch (err: any) {
    if (signal?.aborted || err?.name === 'AbortError') {
      throw err;
    }

    // Retry once if transient error
    if (isTransientError(err)) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (signal?.aborted) {
        throw new DOMException('Operation aborted by user', 'AbortError');
      }
      try {
        return await attemptStream();
      } catch (retryErr: any) {
        if (signal?.aborted || retryErr?.name === 'AbortError') throw retryErr;
        // Fallback to non-streaming if stream repeatedly failed
        return await sendMessage(chat, text, mode);
      }
    }

    // Try non-streaming fallback before giving up
    try {
      return await sendMessage(chat, text, mode);
    } catch {
      throw err;
    }
  }
}

/**
 * Non-streaming fallback for sending a message to the Gemini chat session.
 */
export async function sendMessage(
  chat: any,
  text: string,
  mode: 'chat' | 'voice'
): Promise<string> {
  const formattedMessage = formatUserMessage(text, mode);

  try {
    const response = await chat.sendMessage({ message: formattedMessage });
    return response.text || '';
  } catch (err: any) {
    if (isTransientError(err)) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const retryResponse = await chat.sendMessage({ message: formattedMessage });
      return retryResponse.text || '';
    }
    throw err;
  }
}
