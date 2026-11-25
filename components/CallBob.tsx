import React, { useRef, useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faStop, faRotateRight } from '@fortawesome/free-solid-svg-icons';

import { useVoiceChat } from '../src/hooks/useVoiceChat';
import { FluidOrb, AgentState } from './ui/FluidOrb';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from './ui/conversation';
import { Message, MessageContent } from './ui/message';
import { Orb } from './ui/orb';
import { Response } from './ui/response';

export default function CallBob() {
  const {
    messages,
    status,
    interimTranscript,
    sendText,
    startListening,
    stopListening,
    interrupt,
    isVoiceSupported,
    retryLast,
  } = useVoiceChat();

  const [inputText, setInputText] = useState('');
  const chatScrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Derive Orb State: 'idle' | 'listening' | 'talking' | 'thinking'
  const orbState: AgentState =
    status === 'speaking'
      ? 'talking'
      : status === 'listening'
      ? 'listening'
      : status === 'thinking'
      ? 'thinking'
      : 'idle';

  // Toggle microphone
  const handleToggleMic = () => {
    if (!isVoiceSupported) {
      alert('Voice input needs Chrome or Edge browser.');
      return;
    }
    if (status === 'listening') {
      stopListening();
    } else {
      startListening();
    }
  };

  // Scroll inner chat container automatically on new message or text stream
  useEffect(() => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
    }
  }, [messages, status, interimTranscript]);

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendText(inputText.trim());
    setInputText('');
  };

  return (
    <div className="w-full h-full max-h-full flex flex-col lg:flex-row gap-3 lg:gap-5 items-stretch justify-between font-sans bg-[#090a0d] max-w-7xl mx-auto overflow-hidden min-h-0">
      {/* Left Column: Big Interactive Futuristic Profile Orb */}
      <div className="w-full lg:w-[320px] flex flex-col items-center justify-center gap-4 bg-transparent shrink-0">
        {/* The Fluid Orb with interactive center Microphone toggle (Bigger, bold fluid animation) */}
        <div
          className="flex flex-col items-center justify-center relative shrink-0"
          title={!isVoiceSupported ? 'Voice input needs Chrome or Edge' : undefined}
        >
          <FluidOrb
            agentState={orbState}
            isListening={status === 'listening'}
            onToggleMic={handleToggleMic}
            size={260}
            color="#FF4500"
          />

          {!isVoiceSupported && (
            <div className="mt-2 text-xs text-amber-300 font-medium bg-black/60 px-3 py-1 rounded-full border border-amber-500/20 text-center">
              Voice input needs Chrome or Edge
            </div>
          )}
        </div>

        {/* Real-time Assistant State Badge */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#14161d] border border-white/10 text-xs text-gray-300 shadow-sm">
          <span
            className={`w-2 h-2 rounded-full ${
              status === 'speaking'
                ? 'bg-emerald-400 animate-pulse'
                : status === 'listening'
                ? 'bg-amber-400 animate-pulse'
                : status === 'thinking'
                ? 'bg-[#ff4500] animate-ping'
                : 'bg-gray-500'
            }`}
          />
          <span className="capitalize font-medium text-white text-xs">
            {status === 'speaking'
              ? 'U Fill Acadmey Bot Speaking'
              : status === 'listening'
              ? 'Listening...'
              : status === 'thinking'
              ? 'Thinking...'
              : 'U Fill Acadmey Bot Ready'}
          </span>
        </div>
      </div>

      {/* Right Column: Seamless Conversation Interface & Pinned Input Box (No chat background, no scrollbar) */}
      <div className="flex-1 w-full h-full max-h-full flex flex-col justify-between bg-transparent overflow-hidden min-h-0">
        {/* Conversation Container with transparent background and no border */}
        <div className="flex-1 w-full min-h-0 flex flex-col overflow-hidden bg-transparent border-0 relative">
          <Conversation className="flex-1 h-full min-h-0 flex flex-col overflow-hidden bg-transparent">
            <ConversationContent ref={chatScrollContainerRef} className="flex-1 min-h-0 overflow-y-auto space-y-4 p-2 md:p-4 no-scrollbar">
              {messages.length === 0 ? (
                <ConversationEmptyState
                  icon={<Orb size={36} agentState="idle" />}
                  title="U Fill Acadmey Bot"
                  description="Hello! I'm U Fill Acadmey Bot, your AI assistant. Type a message or click the microphone on the orb to begin speaking."
                />
              ) : (
                messages.map((item) => {
                  const isUser = item.role === 'user';
                  const isAssistant = item.role === 'model';
                  const isError = item.status === 'error';
                  const isStreaming = item.status === 'streaming';

                  if (isUser) {
                    return (
                      <div key={item.id} className="flex flex-col items-end gap-1 w-full max-w-[85%] ml-auto group">
                        <span className="text-xs text-gray-400 font-medium pr-1">You</span>
                        <div className="bg-[#ff4500] text-white self-end rounded-2xl rounded-tr-sm px-4 py-3 text-base md:text-lg font-medium shadow-md leading-relaxed break-words max-w-full">
                          {item.text}
                        </div>
                      </div>
                    );
                  }

                  // Assistant: Teams-like AI agent profile card with full circle small orb avatar
                  return (
                    <div key={item.id} className="flex items-start gap-2.5 sm:gap-3 w-full max-w-[85%] group">
                      {/* Full Circle Small AI Agent Profile Orb Avatar (Small Teams-like circular avatar) */}
                      <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden ring-1 ring-white/20 shadow-sm bg-[#12141a] flex items-center justify-center shrink-0 mt-0.5 aspect-square">
                        <Orb
                          size={28}
                          className="rounded-full"
                          agentState={isStreaming ? 'talking' : null}
                        />
                      </div>

                      {/* Agent Message Content */}
                      <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium pl-0.5">
                          <span className="text-white font-semibold">U Fill Acadmey Bot</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-gray-300 uppercase tracking-wider">
                            Bot
                          </span>
                        </div>

                        <div
                          className={
                            isError
                              ? 'bg-red-950/60 border border-red-500/30 text-red-200 self-start rounded-2xl rounded-tl-sm px-4 py-3 text-sm md:text-base leading-relaxed break-words w-full'
                              : 'bg-[#181b22] border border-white/10 text-white self-start rounded-2xl rounded-tl-sm px-4 py-3 text-base md:text-lg shadow-sm leading-relaxed break-words w-full'
                          }
                        >
                          <Response isStreaming={isStreaming}>
                            {item.text || (isStreaming ? '\u200B' : '')}
                          </Response>

                          {/* Error Retry Option */}
                          {isError && (
                            <button
                              onClick={retryLast}
                              className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-red-200 bg-red-900/60 hover:bg-red-900 px-3 py-1 rounded-md border border-red-500/30 transition-colors w-fit font-medium cursor-pointer"
                            >
                              <FontAwesomeIcon icon={faRotateRight} className="text-xs" />
                              <span>Retry</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Real-time Listening Transcript Live Bubble */}
              {status === 'listening' && (
                <div className="flex flex-col items-end gap-1 w-full max-w-[85%] ml-auto">
                  <span className="text-xs text-gray-400 font-medium pr-1">You</span>
                  <div className="bg-[#ff4500]/70 text-white self-end rounded-2xl rounded-tr-sm px-4 py-3 text-base md:text-lg animate-pulse font-medium shadow-md leading-relaxed break-words max-w-full">
                    <span>{interimTranscript || 'Listening to your voice...'}</span>
                  </div>
                </div>
              )}
            </ConversationContent>

            {/* Scroll-to-bottom helper button */}
            <ConversationScrollButton />
          </Conversation>

          {/* Floating Stop / Intervene Button during Active Conversation */}
          {(status === 'speaking' || status === 'thinking' || status === 'listening') && (
            <div className="absolute top-3 right-4 z-20 flex items-center gap-2.5 bg-[#171a23]/95 border border-white/10 text-white px-3.5 py-1.5 rounded-full shadow-2xl text-xs font-semibold backdrop-blur-md">
              <span
                className={`w-2 h-2 rounded-full ${
                  status === 'speaking'
                    ? 'bg-emerald-400 animate-pulse'
                    : status === 'thinking'
                    ? 'bg-[#ff4500] animate-ping'
                    : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span className="text-gray-200">
                {status === 'speaking'
                  ? 'U Fill Acadmey Bot speaking'
                  : status === 'thinking'
                  ? 'U Fill Acadmey Bot thinking...'
                  : 'Listening to you'}
              </span>
              <button
                type="button"
                onClick={interrupt}
                className="ml-1 flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer shadow hover:scale-105"
                title="Stop conversation (Intervene)"
              >
                <FontAwesomeIcon icon={faStop} className="text-[10px]" />
                <span>Stop</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom Pinned Input Field (Guaranteed Non-overflowing) */}
        <form
          onSubmit={onFormSubmit}
          className="pt-2.5 pb-0 flex items-center gap-2.5 bg-transparent w-full flex-shrink-0"
        >
          <input
            type="text"
            value={status === 'listening' && interimTranscript ? interimTranscript : inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              status === 'listening'
                ? 'Listening to your voice...'
                : 'Type your message or click the mic on the orb...'
            }
            className="flex-1 bg-[#14161c] text-white placeholder-gray-400 text-sm md:text-base px-4 py-2.5 md:py-3 rounded-xl border border-white/10 focus:outline-none focus:border-[#ff4500] transition-colors shadow-inner"
          />

          {/* Quick Intervene / Stop Button in Input Bar */}
          {(status === 'speaking' || status === 'thinking' || status === 'listening') && (
            <button
              type="button"
              onClick={interrupt}
              className="px-3.5 md:px-4 py-2.5 md:py-3 rounded-xl bg-red-600/90 hover:bg-red-600 text-white flex items-center gap-1.5 transition-all cursor-pointer flex-shrink-0 shadow-lg font-semibold text-sm border border-red-500/40 animate-pulse"
              title="Stop / Intervene"
            >
              <FontAwesomeIcon icon={faStop} className="text-xs" />
              <span className="hidden sm:inline">Stop</span>
            </button>
          )}

          <button
            type="submit"
            disabled={!inputText.trim() && !(status === 'listening' && interimTranscript)}
            className="px-4 md:px-5 py-2.5 md:py-3 rounded-xl bg-[#ff4500] hover:bg-[#e03a00] disabled:opacity-30 disabled:hover:bg-[#ff4500] text-white flex items-center justify-center transition-all cursor-pointer flex-shrink-0 shadow-lg font-semibold"
            title="Send"
          >
            <FontAwesomeIcon icon={faPaperPlane} className="text-sm md:text-base" />
          </button>
        </form>
      </div>
    </div>
  );
}
