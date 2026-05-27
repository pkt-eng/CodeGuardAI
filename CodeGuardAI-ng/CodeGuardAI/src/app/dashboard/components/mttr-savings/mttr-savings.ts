import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { MttrAndSavingsData } from '../../models/dashboard.model';

@Component({
  selector: 'app-mttr-savings',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './mttr-savings.html',
  styleUrl: './mttr-savings.css',
})
export class MttrSavings implements OnChanges {
  @Input() data: MttrAndSavingsData[] = [];

  chartData: ChartData<'bar'> = { labels: [], datasets: [] };
  
  chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true }
    },
    scales: {
      x: {
        grid: { display: false }
      },
      // Left Y-Axis for MTTR (Hours)
      y: {
        type: 'linear',
        display: false, // Hiding the axis lines to match the clean look of the design
        position: 'left',
      },
      // Right Y-Axis for Savings (Dollars)
      y1: {
        type: 'linear',
        display: false, 
        position: 'right',
        grid: { display: false }
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
      labels: this.data.map(d => d.month),
      datasets: [
        {
          type: 'line' as any, // Forces this specific dataset to be a line
          label: 'Savings ($)',
          data: this.data.map(d => d.savingsDollars),
          borderColor: '#22c55e', // Vibrant green
          backgroundColor: '#22c55e',
          pointBackgroundColor: '#22c55e',
          tension: 0.4,
          borderWidth: 3,
          fill: false,
          yAxisID: 'y1' // Connects to the right axis
        }as any,
        {
          type: 'bar',
          label: 'MTTR (Hours)',
          data: this.data.map(d => d.mttrHours),
          backgroundColor: '#e2e8f0', // Faded light gray bars
          borderRadius: 2,
          barThickness: 16,
          yAxisID: 'y' // Connects to the left axis
        }
      ]
    };
  }
}