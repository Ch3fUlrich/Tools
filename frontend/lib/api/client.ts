export interface RollDicePayload {
  die: { type: string; sides?: number };
  count: number;
  advantage?: 'none' | 'adv' | 'dis';
}

// Use named exports for all API functions to keep imports consistent across the codebase.
// Default export removed to avoid accidental partial imports.
// Use a relative default so tests and client-side code that expect
// relative API paths don't attempt to call an absolute localhost URL.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export async function rollDice(payload: RollDicePayload) {
  const response = await fetch(`${API_BASE_URL}/api/tools/dice/roll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMessage = `Roll API error: ${response.status}`;
    try {
      const text = await response.text();
      errorMessage += `: ${text}`;
    } catch {
      // If we can't read the response body, just use the status code
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

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
  request: FatLossRequest
): Promise<FatLossResponse> {
  const response = await fetch(`${API_BASE_URL}/api/tools/fat-loss`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    let errorMessage = `Failed to calculate fat loss (${response.status})`;
    try {
      const text = await response.text();
      errorMessage += `: ${text}`;
    } catch {
      // If we can't read the response body, just use the status code
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

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
  const response = await fetch(`${API_BASE_URL}/api/tools/n26-analyzer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errorMessage = `Failed to analyze N26 data (${response.status})`;
    try {
      const text = await response.text();
      errorMessage += `: ${text}`;
    } catch {
      // If we can't read the response body, just use the status code
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

// Authentication API methods
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
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for session management
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    let errorMessage = `Registration failed (${response.status})`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // If we can't parse the error response, use the status text
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function loginUser(request: LoginRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for session management
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    let errorMessage = `Login failed (${response.status})`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // If we can't parse the error response, use the status text
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function logoutUser(): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include', // Include cookies for session management
  });

  if (!response.ok) {
    let errorMessage = `Logout failed (${response.status})`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // If we can't parse the error response, use the status text
    }
    throw new Error(errorMessage);
  }

  return response.json();
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
  const response = await fetch(`${API_BASE_URL}/api/auth/oidc/callback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for session management
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    let errorMessage = `OIDC callback failed (${response.status})`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // If we can't parse the error response, use the status text
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

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
  const response = await fetch(`${API_BASE_URL}/api/tools/bloodlevel/substances`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    let errorMessage = `Failed to get substances (${response.status})`;
    try {
      const text = await response.text();
      errorMessage += `: ${text}`;
    } catch {
      // If we can't read the response body, just use the status code
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function calculateTolerance(
  request: ToleranceCalculationRequest
): Promise<ToleranceCalculationResponse> {
  const response = await fetch(`${API_BASE_URL}/api/tools/bloodlevel/calculate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    let errorMessage = `Failed to calculate tolerance (${response.status})`;
    try {
      const text = await response.text();
      errorMessage += `: ${text}`;
    } catch {
      // If we can't read the response body, just use the status code
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
