import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { AuthModal } from '@/components/auth/AuthModal';

describe('AuthModal extra behaviors', () => {
  test('overlay click triggers onClose', () => {
    const onClose = vi.fn();
    render(<AuthModal isOpen={true} onClose={onClose} />);

    const overlay = document.querySelector('.fixed.inset-0.bg-gray-500');
    if (!overlay) throw new Error('overlay not found');
    fireEvent.click(overlay);

    expect(onClose).toHaveBeenCalled();
  });

  test('defaultMode=register renders RegisterForm by default', () => {
    const onClose = vi.fn();
    render(<AuthModal isOpen={true} onClose={onClose} defaultMode="register" />);

    expect(screen.getByRole('heading', { name: /Create Account/i })).toBeInTheDocument();
  });
});
