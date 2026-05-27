import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardPayload } from './models/dashboard.model';
import { DashboardService } from './services/dashboard.service';
import { RiskOverview } from './components/risk-overview/risk-overview';
import { VulnerabilityTrends } from './components/vulnerability-trends/vulnerability-trends';
import { TopVulnerabilities } from './components/top-vulnerabilities/top-vulnerabilities';
import { FixAdoption } from './components/fix-adoption/fix-adoption';
import { MttrSavings } from './components/mttr-savings/mttr-savings';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RiskOverview, VulnerabilityTrends, TopVulnerabilities, FixAdoption, MttrSavings],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {

  // Injecting the service
  private dashboardService = inject(DashboardService);

  // Variable to hold the fetched data
  dashboardData: DashboardPayload | null = null;

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(): void {
    this.dashboardService.getDashboardData().subscribe({
      next: (data) => {
        this.dashboardData = data;
        console.log('Data successfully loaded into component:', this.dashboardData);
      },
      error: (err) => {
        console.error('Failed to load dashboard data', err);
      }
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
}