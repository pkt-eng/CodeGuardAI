import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { RiskCategory } from '../../models/dashboard.model';

@Component({
  selector: 'app-risk-overview',
  standalone: true,
  imports: [CommonModule, BaseChartDirective], 
  templateUrl: './risk-overview.html',
  styleUrl: './risk-overview.css',
})
export class RiskOverview implements OnChanges {
  @Input() data: RiskCategory[] = [];

  // 1. Define your frontend color palette here
  private palette: string[] = ['#e74c3c', '#f39c12', '#3498db', '#9b59b6', '#2ecc71'];
  
  // 2. Create a new array that holds both the data AND the assigned color for the legend
  public displayData: { label: string, count: number, colorCode: string }[] = [];

  chartData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  chartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%', 
    plugins: {
      legend: { display: false }, 
      tooltip: { enabled: true }
    }
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.data) {
      this.updateChart();
    }
  }

  updateChart() {
    // 3. Map the incoming data to the frontend colors based on their index
    this.displayData = this.data.map((item, index) => ({
      label: item.label,
      count: item.count,
      colorCode: this.palette[index % this.palette.length] // loops colors if there is more data than colors
    }));

    // 4. Feed the combined data to Chart.js
    this.chartData = {
      labels: this.displayData.map(d => d.label),
      datasets: [{
        data: this.displayData.map(d => d.count),
        backgroundColor: this.displayData.map(d => d.colorCode),
        borderWidth: 0,
        hoverOffset: 4
      }]
    };
  }
}