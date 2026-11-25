import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseSpeechRecognitionOptions {
  lang?: string;
  interimResults?: boolean;
  continuous?: boolean;
  onFinalResult?: (transcript: string) => void;
  onError?: (error: string) => void;
}

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  interimTranscript: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  error: string | null;
  isSupported: boolean;
}

/**
 * Friendly error messages mapping for browser SpeechRecognition errors.
 */
const ERROR_MAP: Record<string, string> = {
  'not-allowed': 'Microphone permission was denied. Please allow microphone access.',
  'no-speech': 'No speech was detected. Please try speaking again.',
  'audio-capture': 'No microphone was found or microphone is busy.',
  network: 'Network error occurred during speech recognition.',
  aborted: 'Listening was stopped.',
};

/**
 * Hook for speech-to-text using Web Speech API (SpeechRecognition / webkitSpeechRecognition).
 */
export function useSpeechRecognition({
  lang = 'en-IN',
  interimResults = true,
  continuous = false,
  onFinalResult,
  onError,
}: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const isStartingRef = useRef(false);
  const isMountedRef = useRef(true);
  const finalEmittedRef = useRef(false);

  // Store callbacks in refs to avoid stale closures
  const onFinalResultRef = useRef(onFinalResult);
  onFinalResultRef.current = onFinalResult;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Initialize SpeechRecognition on mount
  useEffect(() => {
    isMountedRef.current = true;
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        setIsSupported(true);
        const recognition = new SpeechRecognition();
        recognition.lang = lang;
        recognition.interimResults = interimResults;
        recognition.continuous = continuous;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          if (!isMountedRef.current) return;
          isStartingRef.current = false;
          setIsListening(true);
          setError(null);
          setInterimTranscript('');
          finalEmittedRef.current = false;
        };

        recognition.onresult = (event: any) => {
          if (!isMountedRef.current) return;
          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              final += transcript;
            } else {
              interim += transcript;
            }
          }

          if (interim) {
            setInterimTranscript(interim);
          }

          if (final && !finalEmittedRef.current) {
            finalEmittedRef.current = true;
            setInterimTranscript('');
            if (onFinalResultRef.current) {
              onFinalResultRef.current(final.trim());
            }
          }
        };

        recognition.onerror = (event: any) => {
          if (!isMountedRef.current) return;
          isStartingRef.current = false;
          setIsListening(false);

          if (event.error === 'aborted') {
            return;
          }

          const friendlyMsg =
            ERROR_MAP[event.error] || `Speech recognition error: ${event.error}`;
          setError(friendlyMsg);
          if (onErrorRef.current) {
            onErrorRef.current(friendlyMsg);
          }
        };

        recognition.onend = () => {
          if (!isMountedRef.current) return;
          isStartingRef.current = false;
          setIsListening(false);
          setInterimTranscript('');
        };

        recognitionRef.current = recognition;
      } else {
        setIsSupported(false);
      }
    }

    return () => {
      isMountedRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [lang, interimResults, continuous]);

  const start = useCallback(() => {
    if (!recognitionRef.current || isStartingRef.current || isListening) return;
    setError(null);
    setInterimTranscript('');
    finalEmittedRef.current = false;
    isStartingRef.current = true;

    try {
      recognitionRef.current.start();
    } catch (e: any) {
      isStartingRef.current = false;
      if (e.name !== 'InvalidStateError') {
        const msg = 'Unable to start microphone. Please check your browser settings.';
        setError(msg);
      }
    }
  }, [isListening]);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    isStartingRef.current = false;
    try {
      recognitionRef.current.stop();
    } catch {
      // ignore
    }
  }, []);

  const abort = useCallback(() => {
    if (!recognitionRef.current) return;
    isStartingRef.current = false;
    try {
      recognitionRef.current.abort();
    } catch {
      // ignore
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    interimTranscript,
    start,
    stop,
    abort,
    error,
    isSupported,
  };
}
