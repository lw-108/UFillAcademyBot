import React from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { cn } from '@/lib/utils';

export interface ResponseProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  isStreaming?: boolean;
}

export function Response({
  children,
  isStreaming = false,
  className,
  ...props
}: ResponseProps) {
  if (typeof children === 'string') {
    return (
      <div
        className={cn('text-white selection:bg-[#ff4500]/40', className)}
        {...props}
      >
        <MarkdownRenderer content={children} />
        {isStreaming && (
          <span className="inline-block size-2 rounded-full bg-[#ff4500] animate-pulse ml-1 align-middle" />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn('text-white selection:bg-[#ff4500]/40', className)}
      {...props}
    >
      {children}
      {isStreaming && (
        <span className="inline-block size-2 rounded-full bg-[#ff4500] animate-pulse ml-1 align-middle" />
      )}
    </div>
  );
}
