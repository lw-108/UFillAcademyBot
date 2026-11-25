import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils';

interface ConversationContextType {
  scrollRef: React.RefObject<HTMLDivElement>;
  scrollToBottom: () => void;
  isAtBottom: boolean;
}

const ConversationContext = createContext<ConversationContextType | null>(null);

export const Conversation = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  return (
    <ConversationContext.Provider
      value={{
        scrollRef,
        scrollToBottom,
        isAtBottom,
      }}
    >
      <div
        ref={ref}
        className={cn('relative flex h-full w-full flex-col overflow-hidden', className)}
        {...props}
      >
        {children}
      </div>
    </ConversationContext.Provider>
  );
});
Conversation.displayName = 'Conversation';

export const ConversationContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const ctx = useContext(ConversationContext);
  const internalRef = useRef<HTMLDivElement | null>(null);
  const activeRef = ctx?.scrollRef || internalRef;

  return (
    <div
      ref={(node) => {
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as any).current = node;
        (activeRef as any).current = node;
      }}
      className={cn(
        'flex-1 overflow-y-auto overflow-x-hidden p-2 md:p-4 space-y-4 scroll-smooth no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]',
        className
      )}
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
      {...props}
    >
      {children}
    </div>
  );
});
ConversationContent.displayName = 'ConversationContent';

export interface ConversationEmptyStateProps
  extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
}

export function ConversationEmptyState({
  icon,
  title,
  description,
  className,
  ...props
}: ConversationEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex h-full min-h-[280px] flex-col items-center justify-center text-center p-6 space-y-3',
        className
      )}
      {...props}
    >
      {icon && <div className="mb-2 text-primary">{icon}</div>}
      <h3 className="text-xl md:text-2xl font-semibold text-white tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-sm md:text-base text-gray-400 max-w-sm">
          {description}
        </p>
      )}
    </div>
  );
}

export function ConversationScrollButton({
  className,
}: {
  className?: string;
}) {
  const ctx = useContext(ConversationContext);
  if (!ctx) return null;

  return (
    <button
      type="button"
      onClick={ctx.scrollToBottom}
      aria-label="Scroll to bottom"
      className={cn(
        'absolute bottom-4 right-4 z-10 flex w-9 h-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md border border-white/20 hover:bg-[#ff4500] hover:border-[#ff4500] transition-all shadow-lg',
        className
      )}
    >
      <FontAwesomeIcon icon={faChevronDown} className="w-3.5 h-3.5" />
    </button>
  );
}
