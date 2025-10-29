import React from 'react';

interface Props {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: Props) {
  return (
    // Low-risk: ensure cards provide a readable default text color for nested content
    <div className={`content-box text-gray-900 dark:text-white ${className}`}>
      {children}
    </div>
  );
}
