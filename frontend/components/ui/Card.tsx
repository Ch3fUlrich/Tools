import React from 'react';

interface Props {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: Props) {
  return (
    <div className={`content-box ${className}`}>
      {children}
    </div>
  );
}
