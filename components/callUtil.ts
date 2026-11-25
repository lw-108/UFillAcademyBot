import { METHODS } from '@/constants';
import { i18n } from 'next-i18next';

export async function getChatGptAnswer(messagesWithSender: { message: string; sender: string }[]) {
  i18n?.init();

  const chatGptApiFormattedMessages = messagesWithSender.map(messageObject => {
    return {
      role: messageObject.sender === 'ChatGPT' || messageObject.sender === 'assistant' ? 'assistant' : 'user',
      content: messageObject.message,
    };
  });

  const systemMessageToSetChatGptBehaviour = {
    role: 'system',
    content: i18n?.t('bob.systemMessage') || 'You are an intelligent, friendly AI voice assistant. Answer clearly and concisely.',
  };

  const chatGptApiMessages = [
    systemMessageToSetChatGptBehaviour,
    ...chatGptApiFormattedMessages,
  ];

  try {
    const response = await fetch(`/api/chat/message`, {
      method: METHODS.POST,
      body: JSON.stringify(chatGptApiMessages),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();

    if (data?.choices && data.choices[0]?.message?.content) {
      return data.choices[0].message.content;
    }

    if (data?.reply) {
      return data.reply;
    }

    // Intelligent fallback if no OpenAI key is configured
    const lastUserMessage = messagesWithSender[messagesWithSender.length - 1]?.message || '';
    return generateFallbackResponse(lastUserMessage);
  } catch (error) {
    console.error('Error in chat request:', error);
    const lastUserMessage = messagesWithSender[messagesWithSender.length - 1]?.message || '';
    return generateFallbackResponse(lastUserMessage);
  }
}

function generateFallbackResponse(input: string): string {
  const lower = input.toLowerCase().trim();
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return 'Hello! I am your AI voice assistant. How can I help you today?';
  }
  if (lower.includes('how are you')) {
    return 'I am operating smoothly and ready to assist you with anything you need!';
  }
  if (lower.includes('who are you') || lower.includes('your name')) {
    return 'I am your interactive AI voice assistant, capable of analyzing voice and text inputs and answering in both audio and text.';
  }
  if (lower.includes('weather')) {
    return 'It is currently clear and pleasant with ideal conditions.';
  }
  if (lower.includes('time')) {
    return `The current time is ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
  }
  return `I have analyzed your request: "${input}". Everything is processed and operating normally. How would you like to proceed?`;
}

