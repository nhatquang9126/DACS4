export interface Recommendation {
  id: number;
  action_text: string;
  reason: string;
  priority: number; // 1: Cao, 2: Trung bình, 3: Thấp
  status: string;
}

export interface PredictionData {
  id: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  model_version: string;
  features_used: string; // JSON string
  created_at: string;
  recommendations: Recommendation[];
}

export interface DashboardResponse {
  source: 'CACHE' | 'LIVE_PREDICTION';
  prediction: PredictionData;
}