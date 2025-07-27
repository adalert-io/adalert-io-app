'use client';

import { useIntercomContext } from './IntercomProvider';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';

interface IntercomLauncherProps {
  variant?: 'default' | 'floating' | 'inline';
  className?: string;
  children?: React.ReactNode;
}

export const IntercomLauncher = ({ 
  variant = 'default', 
  className = '',
  children 
}: IntercomLauncherProps) => {
  const { show } = useIntercomContext();

  const handleClick = () => {
    show();
  };

  if (variant === 'floating') {
    return (
      <Button
        onClick={handleClick}
        size="icon"
        className={`fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 ${className}`}
        aria-label="Open chat support"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  if (variant === 'inline') {
    return (
      <Button
        onClick={handleClick}
        variant="outline"
        className={`inline-flex items-center gap-2 ${className}`}
      >
        <MessageCircle className="h-4 w-4" />
        {children || 'Get Help'}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleClick}
      className={`inline-flex items-center gap-2 ${className}`}
    >
      <MessageCircle className="h-4 w-4" />
      {children || 'Contact Support'}
    </Button>
  );
}; 