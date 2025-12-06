'use client';

import { Sparkles } from 'lucide-react';
import clsx from 'clsx';

interface AIAssistantButtonProps {
  onClick: () => void;
  className?: string;
}

export default function AIAssistantButton({ onClick, className }: AIAssistantButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'group flex h-9 w-9 items-center justify-center rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400',
        'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
        'hover:border-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-200',
        className
      )}
      aria-label="AI Ассистент"
      title="AI Ассистент (помощь по платформе)"
    >
      <Sparkles className="h-4 w-4 transition group-hover:scale-110" />
    </button>
  );
}

