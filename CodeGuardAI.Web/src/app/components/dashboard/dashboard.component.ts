import { Component, OnInit, inject,signal  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, DashboardMetrics, Vulnerability } from '../../services/api.service';
import { DashboardPayload } from '../../models/dashboard.model';
import { RiskOverview } from '../risk-overview/risk-overview';
import { VulnerabilityTrends } from '../vulnerability-trends/vulnerability-trends';
import { TopVulnerabilities } from '../top-vulnerabilities/top-vulnerabilities';
import { FixAdoption } from '../fix-adoption/fix-adoption';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule,RouterModule, RiskOverview,VulnerabilityTrends,TopVulnerabilities,FixAdoption],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {

  // Injecting the service
  private dashboardService = inject(ApiService);

  // Variable to hold the fetched data
  dashboardData: DashboardPayload | null = null;
  
  loading = signal(true);
  metrics = signal<DashboardMetrics | null>(null);
  vulnerabilities = signal<Vulnerability[]>([]);

  constructor(public apiService: ApiService, private router: Router) {}
  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(): void {
    this.loading.set(true);
    
    // Use a counter or robust way to manage multiple requests. For simplicity, just decrement a counter.
    let pendingRequests = 2;
    const checkComplete = () => {
      pendingRequests--;
      if (pendingRequests === 0) {
        this.loading.set(false);
      }
    };

    this.dashboardService.getDashboardData().subscribe({
      next: (data) => {
        this.dashboardData = data;
        checkComplete();
      },
      error: (err) => {
        console.error('Failed to load dashboard data', err);
        checkComplete();
      }
    });

    this.dashboardService.getDashboardMetrics().subscribe({
      next: (m) => {
        this.metrics.set(m);
        
        // Fetch vulnerabilities too
        this.dashboardService.getVulnerabilities().subscribe({
          next: (v) => {
            this.vulnerabilities.set(v);
            checkComplete();
          },
          error: () => checkComplete()
        });
      },
      error: () => checkComplete()
    });
  }

  exportReports() {
    if (!this.dashboardData) return;

    let csvContent = "data:text/csv;charset=utf-8,";

    // --- SECTION 1: OVERALL METRICS ---
    csvContent += "--- CODEGUARD AI EXECUTIVE SUMMARY ---\n";
    csvContent += `Overall Fix Adoption Rate,${this.dashboardData.fixAdoptionRate}%\n\n`;

    // --- SECTION 2: RISK OVERVIEW ---
    csvContent += "--- RISK OVERVIEW ---\n";
    csvContent += "Risk Level,Count\n";
    this.dashboardData.riskOverview.forEach(row => {
      csvContent += `${row.label},${row.count}\n`;
    });
    csvContent += "\n"; // Adds a blank row for spacing

    // --- SECTION 3: TOP VULNERABILITIES ---
    csvContent += "--- TOP VULNERABILITIES ---\n";
    csvContent += "Vulnerability Name,Occurrences\n";
    this.dashboardData.topVulnerabilities.forEach(row => {
      csvContent += `${row.name},${row.occurrences}\n`;
    });
    csvContent += "\n";

    // --- SECTION 4: MTTR & SAVINGS ---
    csvContent += "--- MTTR & SAVINGS ---\n";
    csvContent += "Month,MTTR (Hours),Savings ($)\n";
    this.dashboardData.mttrAndSavings.forEach(row => {
      csvContent += `${row.month},${row.mttrHours},${row.savingsDollars}\n`;
    });
    csvContent += "\n";

    // --- SECTION 5: DAILY TRENDS ---
    csvContent += "--- 7-DAY TRENDS ---\n";
    csvContent += "Date,Vulnerabilities Detected,AI Fixes Applied\n";
    this.dashboardData.vulnerabilityTrends.forEach(row => {
      csvContent += `${row.day},${row.vul},${row.Aifix}\n`;
    });

    // Generate the download link and click it
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    // Renamed the file to reflect the full report
    link.setAttribute("download", "codeguard-full-executive-report.csv"); 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  logout(): void {
    this.dashboardService.logout();
    this.router.navigate(['/login']);
  }

  openRemediation(id: number): void {
    this.router.navigate(['/remediation', id]);
  }

  getRiskColor(score: number): string {
    if (score >= 80) return '#10B981'; // Green (secure)
    if (score >= 50) return '#F59E0B'; // Yellow (moderate threat)
    return '#EF4444'; // Red (severe threat)
  }

  getRiskStatusLabel(score: number): string {
    if (score >= 80) return '🛡️ SECURE STATUS';
    if (score >= 50) return '⚠️ ELEVATED RISK';
    return '🚨 CRITICAL COMPROMISE';
  }
}