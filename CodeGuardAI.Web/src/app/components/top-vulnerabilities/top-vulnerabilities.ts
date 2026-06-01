import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { TopVulnerability } from '../../models/dashboard.model';

@Component({
  selector: 'app-top-vulnerabilities',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './top-vulnerabilities.html',
  styleUrl: './top-vulnerabilities.css',
})
export class TopVulnerabilities implements OnChanges {
  @Input() data: TopVulnerability[] = [];

  // Frontend color palette for the bars
  private barColors: string[] = ['#3b82f6', '#10b981', '#8b5cf6', '#0ea5e9', '#f59e0b', '#ef4444'];

  chartData: ChartData<'bar'> = { labels: [], datasets: [] };
  
  chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }, // Hide legend, rely on x-axis labels
      tooltip: { enabled: true }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#f0f0f0' }
      },
      x: {
        grid: { display: false },
        ticks: {
          // Truncate long labels so they don't take up too much space
          callback: function(value: any, index: number, values: any) {
            const label = this.getLabelForValue(value);
            return label.length > 15 ? label.substring(0, 15) + '...' : label;
          }
        }
      }
    }
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.data && this.data.length > 0) {
      this.updateChart();
    }
  }

  updateChart() {
    this.chartData = {
      labels: this.data.map(d => d.name),
      datasets: [{
        data: this.data.map(d => d.occurrences),
        // Apply colors from our palette based on the index
        backgroundColor: this.data.map((_, i) => this.barColors[i % this.barColors.length]),
        borderRadius: 4, // Rounds the top of the bars slightly
        barThickness: 24 // Keeps bars from getting too wide
      }]
    };
  }
}