import React from 'react';
import { cn } from '@/lib/utils';

export interface MessageProps extends React.HTMLAttributes<HTMLDivElement> {
  from: 'user' | 'assistant' | 'model';
}

export const Message = React.forwardRef<HTMLDivElement, MessageProps>(
  ({ from, className, children, ...props }, ref) => {
    const isUser = from === 'user';

    return (
      <div
        ref={ref}
        className={cn(
          'flex w-full items-start gap-3 transition-all',
          isUser ? 'justify-end' : 'justify-start',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Message.displayName = 'Message';

export const MessageContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'flex max-w-[85%] flex-col rounded-2xl px-4 py-3 text-base md:text-lg leading-relaxed shadow-sm break-words',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
MessageContent.displayName = 'MessageContent';
