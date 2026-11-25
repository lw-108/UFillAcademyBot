import { useState, useEffect, useRef, useCallback } from 'react';

export interface SpeakOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  voice?: SpeechSynthesisVoice | string | null;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

export interface UseSpeechSynthesisReturn {
  isSpeaking: boolean;
  speak: (text: string, options?: SpeakOptions) => void;
  cancel: () => void;
  voices: SpeechSynthesisVoice[];
  isSupported: boolean;
}

/**
 * Splits text into sentence chunks under maxChunkLength (~200 characters)
 * to avoid the Chrome 15-second speech cutoff issue.
 */
export function chunkText(text: string, maxChunkLength = 180): string[] {
  if (!text) return [];

  // Match sentences ending in punctuation or newlines
  const rawSentences = text.match(/[^.!?;\n]+[.!?;\n]+|[^.!?;\n]+$/g) || [text];
  const chunks: string[] = [];

  for (const sentence of rawSentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (trimmed.length <= maxChunkLength) {
      chunks.push(trimmed);
    } else {
      // Split sentence further by commas or word boundaries
      const words = trimmed.split(' ');
      let currentChunk = '';

      for (const word of words) {
        if ((currentChunk + ' ' + word).trim().length <= maxChunkLength) {
          currentChunk = (currentChunk + ' ' + word).trim();
        } else {
          if (currentChunk) chunks.push(currentChunk);
          currentChunk = word;
        }
      }
      if (currentChunk) {
        chunks.push(currentChunk);
      }
    }
  }

  return chunks;
}

/**
 * Hook providing speech synthesis with sentence chunking and cancellation.
 */
export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSupported, setIsSupported] = useState(false);

  const activeQueueRef = useRef<SpeechSynthesisUtterance[]>([]);
  const isCancelledRef = useRef(false);
  const onEndCallbackRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);

      const updateVoices = () => {
        const available = window.speechSynthesis.getVoices();
        if (available && available.length > 0) {
          setVoices(available);
        }
      };

      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const cancel = useCallback(() => {
    isCancelledRef.current = true;
    activeQueueRef.current = [];
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    setIsSpeaking(false);
    onEndCallbackRef.current = null;
  }, []);

  const speak = useCallback(
    (text: string, options: SpeakOptions = {}) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }

      // Cancel any ongoing speech first
      cancel();
      isCancelledRef.current = false;
      onEndCallbackRef.current = options.onEnd || null;

      const chunks = chunkText(text);
      if (chunks.length === 0) {
        if (options.onEnd) options.onEnd();
        return;
      }

      // Resolve voice
      let selectedVoice: SpeechSynthesisVoice | null = null;
      if (options.voice && typeof options.voice === 'object') {
        selectedVoice = options.voice;
      } else if (typeof options.voice === 'string' && voices.length > 0) {
        const query = options.voice.toLowerCase();
        selectedVoice =
          voices.find((v) => v.name.toLowerCase().includes(query) || v.lang.toLowerCase().includes(query)) || null;
      }

      if (!selectedVoice && voices.length > 0) {
        const targetLang = options.lang || 'en';
        selectedVoice =
          voices.find((v) => v.lang.toLowerCase().startsWith(targetLang.toLowerCase())) || voices[0];
      }

      setIsSpeaking(true);

      // Create queued utterances
      const utterances: SpeechSynthesisUtterance[] = chunks.map((chunk, index) => {
        const utterance = new SpeechSynthesisUtterance(chunk);
        if (selectedVoice) utterance.voice = selectedVoice;
        if (options.lang) utterance.lang = options.lang;
        if (options.rate !== undefined) utterance.rate = options.rate;
        if (options.pitch !== undefined) utterance.pitch = options.pitch;

        utterance.onerror = (e) => {
          if (isCancelledRef.current) return;
          console.warn('Speech synthesis utterance error:', e);
          if (options.onError) options.onError(e);
        };

        if (index === chunks.length - 1) {
          utterance.onend = () => {
            if (isCancelledRef.current) return;
            setIsSpeaking(false);
            if (onEndCallbackRef.current) {
              onEndCallbackRef.current();
            }
          };
        }

        return utterance;
      });

      activeQueueRef.current = utterances;

      // Speak utterances sequentially
      utterances.forEach((u) => {
        window.speechSynthesis.speak(u);
      });
    },
    [cancel, voices]
  );

  return {
    isSpeaking,
    speak,
    cancel,
    voices,
    isSupported,
  };
}
