import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useTranslation } from 'next-i18next';
import { useLanguage } from './LanguageManager';

import { getChatGptAnswer } from './callUtil';
import { CallHistoryType } from './CallHistory';

export interface MessageType {
  message: string;
  sender: string;
}

interface CallContextType {
  userCall: () => void;
  userSpeak: () => void;
  userStopSpeaking: () => void;
  listening: boolean;
  isCalling: boolean;
  endCall: () => void;
  handleSend: (message: string) => void;
  messages: MessageType[];
  isChatbotSpeaking: boolean;
  selectedVoice: string;
  setSelectedVoice: (voiceId: string) => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

type CallManagerProps = {
  children: React.ReactNode;
};

const CallManager: React.FC<CallManagerProps> = ({ children }) => {
  const isUserCalling = useRef(false);
  const isChatbotSpeaking = useRef(false);

  const commands = [
    {
      command: ['*'],
      callback: (command: string) => handleSend(command),
    },
  ];

  const [isBobSpeaking, setIsBobSpeaking] = useState(isChatbotSpeaking.current);
  const [isCalling, setIsCalling] = useState(isUserCalling.current);
  const { transcript, resetTranscript, listening } = useSpeechRecognition({
    commands,
  });
  const { t } = useTranslation();
  const [userSpeechSynthesis, setUserSpeechSynthesis] = useState<SpeechSynthesis>();
  const [userLocalStorage, setUserLocalStorage] = useState<Storage>();
  const { selectedLanguage } = useLanguage();
  const defaultIntroduction = t('bob.introduction');
  const defaultMessage = [
    {
      message: defaultIntroduction,
      sender: 'ChatGPT',
    },
  ];
  const [messages, setMessages] = useState<MessageType[]>(defaultMessage);
  const [selectedVoice, setSelectedVoice] = useState<string>('adam');

  useEffect(() => {
    setUserSpeechSynthesis(window.speechSynthesis);
    setUserLocalStorage(localStorage);
  }, []);

  // if selectedLanguage changes, reset call
  useEffect(() => {
    endCall();
  }, [defaultIntroduction, selectedLanguage]);

  const chatBotSpeak = (message: string) => {
    if (isChatbotSpeaking.current || !userSpeechSynthesis || !isUserCalling.current) {
      return;
    }

    if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
      userSpeechSynthesis.speak(
        new SpeechSynthesisUtterance(t('bob.browserNotSupportSpeechRecognitionMessage'))
      );
      return;
    }
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = selectedLanguage;
    utterance.onstart = handleChatbotSpeechStart;
    utterance.onend = handleChatbotSpeechEnd;

    // Apply voice preferences according to selectedVoice
    const availableVoices = userSpeechSynthesis.getVoices();
    if (availableVoices && availableVoices.length > 0) {
      const matched = availableVoices.find(v =>
        v.name.toLowerCase().includes(selectedVoice.toLowerCase())
      );
      if (matched) {
        utterance.voice = matched;
      }
    }

    // Voice modulation based on voice profile
    if (selectedVoice === 'rachel') {
      utterance.pitch = 1.1;
      utterance.rate = 1.0;
    } else if (selectedVoice === 'adam') {
      utterance.pitch = 0.85;
      utterance.rate = 0.95;
    } else if (selectedVoice === 'domi') {
      utterance.pitch = 1.25;
      utterance.rate = 1.1;
    } else if (selectedVoice === 'clyde') {
      utterance.pitch = 0.7;
      utterance.rate = 0.9;
    } else if (selectedVoice === 'charlotte') {
      utterance.pitch = 1.05;
      utterance.rate = 0.95;
    }

    userSpeechSynthesis.speak(utterance);
  };

  const handleChatbotSpeechStart = () => {
    isChatbotSpeaking.current = true;
    setIsBobSpeaking(true);
    SpeechRecognition.stopListening();
  };

  const handleChatbotSpeechEnd = () => {
    if (isUserCalling.current) {
      SpeechRecognition.startListening({ language: selectedLanguage });
    }
    isChatbotSpeaking.current = false;
    setIsBobSpeaking(false);
  };

  const handleSend = async (message: string) => {
    if (!message) {
      return;
    }
    const formattedMessage = {
      message,
      direction: 'outgoing',
      sender: 'user',
    };

    const updatedMessages = [...messages, formattedMessage];

    setMessages(updatedMessages);

    // Call from conversation ideas
    if (!isUserCalling.current) {
      isUserCalling.current = true;
      setIsCalling(isUserCalling.current);
    }
    if (isChatbotSpeaking.current) {
      userSpeechSynthesis?.cancel();
      isChatbotSpeaking.current = false;
      setIsBobSpeaking(false);
    }
    const chatGPTAnswer = await getChatGptAnswer(updatedMessages);
    const validAnswer = chatGPTAnswer || "I've analyzed your input and am here to assist.";
    
    setMessages([
      ...updatedMessages,
      {
        message: validAnswer,
        sender: 'ChatGPT',
      },
    ]);
    chatBotSpeak(validAnswer);
  };

  const userSpeak = () => {
    SpeechRecognition.startListening({ language: selectedLanguage });

    if (transcript !== '') {
      resetTranscript();
    }
  };
  const userStopSpeaking = () => {
    SpeechRecognition.stopListening();
  };

  const userCall = () => {
    isUserCalling.current = true;
    setIsCalling(isUserCalling.current);

    if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
      setMessages([
        ...messages,
        {
          message: t('bob.browserNotSupportSpeechRecognitionMessage'),
          sender: 'ChatGPT',
        },
      ]);
      isUserCalling.current = false;
      setIsCalling(isUserCalling.current);
      return;
    }

    const firstMessage = t('bob.firstMessage');
    const formattedMessage = {
      message: firstMessage,
      sender: 'assistant',
    };

    const updatedMessages = [...messages, formattedMessage];

    setMessages(updatedMessages);
    chatBotSpeak(firstMessage);
  };

  const resetConversation = () => {
    setMessages(defaultMessage);
  };

  const updateCallHistory = () => {
    if (userLocalStorage && messages.length > 1) {
      const storage = userLocalStorage.getItem('callHistory')
        ? JSON.parse(userLocalStorage.getItem('callHistory') as string)
        : [];
      const newCallHistory: CallHistoryType[] = [...storage, { messages, date: new Date() }];
      userLocalStorage?.setItem('callHistory', JSON.stringify(newCallHistory));
    }
  };

  const hangUp = () => {
    SpeechRecognition.stopListening();
    resetConversation();
    isUserCalling.current = false;
    setIsCalling(isUserCalling.current);
    if (isChatbotSpeaking.current) {
      userSpeechSynthesis?.cancel();
      isChatbotSpeaking.current = false;
      setIsBobSpeaking(false);
    }
    SpeechRecognition.abortListening();
  };

  const endCall = () => {
    hangUp();
    updateCallHistory();
  };

  return (
    <CallContext.Provider
      value={{
        userCall,
        userSpeak,
        userStopSpeaking,
        listening,
        isCalling,
        endCall,
        handleSend,
        messages,
        isChatbotSpeaking: isBobSpeaking,
        selectedVoice,
        setSelectedVoice,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCallManager = () => {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error('useCallManager must be used within a CallManager');
  }
  return context;
};

export default CallManager;
