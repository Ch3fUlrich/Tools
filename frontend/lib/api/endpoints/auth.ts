import { jsonPost, authGet, authPut } from '../core';
import type {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  UserProfileResponse,
  OIDCCallbackRequest,
  OIDCCallbackResponse
} from '../../types/api/types';

export async function registerUser(request: RegisterRequest): Promise<AuthResponse> {
  return jsonPost('/api/auth/register', request, 'Registration failed');
}

export async function loginUser(request: LoginRequest): Promise<AuthResponse> {
  return jsonPost('/api/auth/login', request, 'Login failed');
}

export async function logoutUser(): Promise<AuthResponse> {
  return jsonPost('/api/auth/logout', {}, 'Logout failed');
}

export async function getUserProfile(): Promise<UserProfileResponse> {
  return authGet('/api/auth/me', 'Failed to fetch user profile');
}

export async function updateUserProfile(display_name: string): Promise<void> {
  return authPut('/api/auth/profile', { display_name }, 'Failed to update profile');
}

export async function startOIDCLogin(): Promise<void> {
  try {
    window.location.href = '/api/auth/oidc/start';
  } catch {
    // Expected in tests
  }
}

export async function handleOIDCCallback(request: OIDCCallbackRequest): Promise<OIDCCallbackResponse> {
  const params = new URLSearchParams({ code: request.code, state: request.state });
  return authGet(`/api/auth/oidc/callback?${params}`, 'OIDC login failed');
}
