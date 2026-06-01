import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';

@Component({
  selector: 'app-fix-adoption',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './fix-adoption.html',
  styleUrl: './fix-adoption.css',
})
export class FixAdoption implements OnChanges {
  // We only need a single number for this chart
  @Input() rate: number = 0;

  chartData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  
  chartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '80%', // Makes it a very thin ring like a gauge
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false } // Disable hover tooltips for a cleaner look
    }
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rate'] && this.rate !== undefined) {
      this.updateChart();
    }
  }

  updateChart() {
    this.chartData = {
      labels: ['Adopted', 'Pending'],
      datasets: [{
        // The actual rate, and the remainder out of 100
        data: [this.rate, 100 - this.rate],
        // Green for the filled part, light gray for the empty track
        backgroundColor: ['#22c55e', '#e2e8f0'], 
        borderWidth: 0
      }]
    };
  }
}