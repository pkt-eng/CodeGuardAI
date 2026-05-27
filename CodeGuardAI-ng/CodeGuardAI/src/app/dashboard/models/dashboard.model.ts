
export interface RiskCategory {
  label: string;
  count: number;
}

export interface TrendDataPoint {
  day: string; 
  vul: number;
  Aifix: number;
}

export interface TopVulnerability {
  name: string;
  occurrences: number;
}

export interface MttrAndSavingsData {
  month: string;
  mttrHours: number;
  savingsDollars: number;
}

export interface DashboardPayload {
  riskOverview: RiskCategory[];
  vulnerabilityTrends: TrendDataPoint[];
  topVulnerabilities: TopVulnerability[];
  fixAdoptionRate: number;
  mttrAndSavings: MttrAndSavingsData[];
}