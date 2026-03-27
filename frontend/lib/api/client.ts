// Use named exports for all API functions to keep imports consistent across the codebase.
// Use a relative default so tests and client-side code that expect
// relative API paths don't attempt to call an absolute localhost URL.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

/** Default request timeout in milliseconds (15 seconds). */
const DEFAULT_TIMEOUT_MS = 15_000;

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Central fetch wrapper with timeout, consistent error handling, and 401 detection.
 * All public API functions should call this instead of raw `fetch`.
 */
async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
  errorPrefix: string,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      // On 401, broadcast so AuthContext can clear state
      if (response.status === 401) {
        try {
          window.dispatchEvent(new CustomEvent('auth:session-expired'));
        } catch {
          // SSR / test environment — ignore
        }
      }

      let detail = '';
      try {
        const body = await response.text();
        // Try to extract a JSON error message
        try {
          const parsed = JSON.parse(body);
          if (parsed.error) detail = parsed.error;
          else detail = body;
        } catch {
          detail = body;
        }
      } catch {
        // text() not available (e.g. in test mocks) — try json() directly
        try {
          const data = await response.json();
          if (data?.error) detail = data.error;
        } catch {
          // Cannot read response body at all — ignore
        }
      }

      throw new Error(
        detail
          ? `${errorPrefix} (${response.status}): ${detail}`
          : `${errorPrefix} (${response.status})`,
      );
    }

    // Some endpoints return no body (204, etc.)
    const contentType = response.headers?.get?.('content-type') || '';
    if (contentType.includes('application/json')) {
      return (await response.json()) as T;
    }
    // Fallback: try parsing as JSON (many test mocks don't set headers)
    if (typeof response.json === 'function') {
      try {
        return (await response.json()) as T;
      } catch {
        // Not JSON — return empty
      }
    }
    return {} as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Shorthand for JSON POST requests with credentials. */
function jsonPost<T>(path: string, body: unknown, errorPrefix: string): Promise<T> {
  return apiRequest<T>(
    `${API_BASE_URL}${path}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    },
    errorPrefix,
  );
}

/** Shorthand for authenticated GET requests. */
function authGet<T>(path: string, errorPrefix: string): Promise<T> {
  return apiRequest<T>(
    `${API_BASE_URL}${path}`,
    { credentials: 'include' },
    errorPrefix,
  );
}

// ─── Dice ────────────────────────────────────────────────────────────────────

export interface RollDicePayload {
  die: { type: string; sides?: number };
  count: number;
  advantage?: 'none' | 'adv' | 'dis';
}

export async function rollDice(payload: RollDicePayload) {
  return apiRequest(
    `${API_BASE_URL}/api/tools/dice/roll`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Roll API error',
  );
}

// ─── Fat Loss ────────────────────────────────────────────────────────────────

export interface FatLossRequest {
  kcal_deficit: number;
  weight_loss_kg: number;
}

export interface FatLossResponse {
  fat_loss_percentage: number | null;
  muscle_loss_percentage: number | null;
  is_valid: boolean;
}

export async function calculateFatLoss(
  request: FatLossRequest,
): Promise<FatLossResponse> {
  return apiRequest<FatLossResponse>(
    `${API_BASE_URL}/api/tools/fat-loss`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    },
    'Failed to calculate fat loss',
  );
}

// ─── N26 Analyzer ────────────────────────────────────────────────────────────

export interface Transaction {
  amount: number;
  date: string;
  category: string;
  comment: string;
}

export interface AnalysisResult {
  transactions: Transaction[];
  category_totals: Record<string, number>;
  overall_total: number;
}

export async function analyzeN26Data(data: Record<string, unknown>): Promise<AnalysisResult> {
  return apiRequest<AnalysisResult>(
    `${API_BASE_URL}/api/tools/n26-analyzer`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
    'Failed to analyze N26 data',
  );
}

// ─── Authentication ──────────────────────────────────────────────────────────

export interface RegisterRequest {
  email: string;
  password: string;
  display_name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  id?: string;
  ok?: boolean;
  error?: string;
}

export async function registerUser(request: RegisterRequest): Promise<AuthResponse> {
  return jsonPost<AuthResponse>('/api/auth/register', request, 'Registration failed');
}

export async function loginUser(request: LoginRequest): Promise<AuthResponse> {
  return jsonPost<AuthResponse>('/api/auth/login', request, 'Login failed');
}

export async function logoutUser(): Promise<AuthResponse> {
  return apiRequest<AuthResponse>(
    `${API_BASE_URL}/api/auth/logout`,
    { method: 'POST', credentials: 'include' },
    'Logout failed',
  );
}

export interface UserProfileResponse {
  id: string;
  email: string;
  display_name?: string;
  created_at: string;
}

export async function getUserProfile(): Promise<UserProfileResponse> {
  return authGet<UserProfileResponse>('/api/auth/me', 'Failed to get profile');
}

export async function updateUserProfile(display_name: string): Promise<void> {
  return apiRequest<void>(
    `${API_BASE_URL}/api/auth/profile`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ display_name }),
    },
    'Failed to update profile',
  );
}

export async function startOIDCLogin(): Promise<void> {
  // Redirect to OIDC start endpoint
  window.location.href = `${API_BASE_URL}/api/auth/oidc/start`;
}

export interface OIDCCallbackRequest {
  code: string;
  state?: string;
}

export interface OIDCCallbackResponse {
  user: {
    id: string;
    email: string;
    created_at: string;
  };
}

export async function handleOIDCCallback(request: OIDCCallbackRequest): Promise<OIDCCallbackResponse> {
  return jsonPost<OIDCCallbackResponse>('/api/auth/oidc/callback', request, 'OIDC callback failed');
}

// ─── Blood Level / Tolerance ─────────────────────────────────────────────────

export interface Substance {
  id: string;
  name: string;
  halfLifeHours: number;
  description?: string;
  category?: string;
  commonDosageMg?: number;
  maxDailyDoseMg?: number;
  eliminationRoute?: string;
  bioavailabilityPercent?: number;
}

export interface SubstanceIntakeRequest {
  substance: string;
  time: string;
  intake_type: string;
  time_after_meal: number | null;
  dosage_mg: number;
}

export interface ToleranceCalculationRequest {
  intakes: SubstanceIntakeRequest[];
  time_points: string[];
}

export interface BloodLevelPoint {
  time: string;
  substance: string;
  amountMg: number;
}

export interface ToleranceCalculationResponse {
  blood_levels: BloodLevelPoint[];
}

export async function getToleranceSubstances(): Promise<Substance[]> {
  return apiRequest<Substance[]>(
    `${API_BASE_URL}/api/tools/bloodlevel/substances`,
    { method: 'GET', headers: { 'Content-Type': 'application/json' } },
    'Failed to get substances',
  );
}

export async function calculateTolerance(
  request: ToleranceCalculationRequest,
): Promise<ToleranceCalculationResponse> {
  return apiRequest<ToleranceCalculationResponse>(
    `${API_BASE_URL}/api/tools/bloodlevel/calculate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    },
    'Failed to calculate tolerance',
  );
}

// ─── Dice History ────────────────────────────────────────────────────────────

export interface DiceHistoryEntry {
  id?: string;
  payload: unknown;
  created_at: string;
}

export async function saveDiceRoll(payload: unknown): Promise<void> {
  try {
    await jsonPost<void>('/api/tools/dice/save', { payload }, 'Save dice roll failed');
  } catch {
    // Best-effort: silently ignore save failures
  }
}

export async function getDiceHistory(): Promise<DiceHistoryEntry[]> {
  return authGet<DiceHistoryEntry[]>('/api/tools/dice/history', 'History fetch failed');
}
