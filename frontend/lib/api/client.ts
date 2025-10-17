const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
    const text = await response.text();
    throw new Error(`Failed to calculate fat loss (${response.status}): ${text}`);
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
    const text = await response.text();
    throw new Error(`Failed to analyze N26 data (${response.status}): ${text}`);
  }

  return response.json();
}
