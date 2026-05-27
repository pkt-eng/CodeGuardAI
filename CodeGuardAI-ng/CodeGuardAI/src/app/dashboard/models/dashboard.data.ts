import { DashboardPayload } from './dashboard.model';

export const mockDashboardData: DashboardPayload = {
  riskOverview: [
    { label: 'High Risk', count: 100 },
    { label: 'Medium Risk', count: 340 },
    { label: 'Low Risk', count: 875 }
  ],
  vulnerabilityTrends: [
    { day: '21-05', vul: 100, Aifix: 80 },
    { day: '22-05', vul: 120, Aifix: 70 },
    { day: '23-05', vul: 90, Aifix: 80 },
    { day: '24-05', vul: 110, Aifix: 95 },
    { day: '25-05', vul: 85, Aifix: 82 },
    { day: '26-05', vul: 70, Aifix: 68 },
    { day: '27-05', vul: 65, Aifix: 60 }
  ],
  topVulnerabilities: [
    { name: 'SQL Injection', occurrences: 45 },
    { name: 'Cross-Site Scripting', occurrences: 38 },
    { name: 'Broken Authentication', occurrences: 65 },
    { name: 'Insecure Direct Object Ref', occurrences: 25 }
  ],
  fixAdoptionRate: 87,
  mttrAndSavings: [
    { month: 'Jan', mttrHours: 72, savingsDollars: 1500 },
    { month: 'Feb', mttrHours: 65, savingsDollars: 2200 },
    { month: 'Mar', mttrHours: 58, savingsDollars: 3100 },
    { month: 'Apr', mttrHours: 45, savingsDollars: 4500 }
  ]
};