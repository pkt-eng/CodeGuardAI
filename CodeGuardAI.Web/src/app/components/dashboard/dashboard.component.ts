import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService, DashboardMetrics, Vulnerability } from '../../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-[#05070B] text-slate-100 flex font-sans">
      
      <!-- NAVIGATION SIDEBAR -->
      <aside class="w-64 border-r border-white/5 bg-[#080B11]/90 flex flex-col fixed h-full z-20">
        <!-- Logo -->
        <div class="p-6 border-b border-white/5 flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyber-blue to-cyber-cyan p-0.5 shadow-md shadow-cyber-blue/15 flex items-center justify-center">
            <span class="font-extrabold text-white text-lg">CG</span>
          </div>
          <div>
            <h1 class="text-md font-bold tracking-wider text-white">CodeGuard <span class="text-cyber-cyan">AI</span></h1>
            <span class="text-[10px] text-slate-500 font-mono tracking-widest uppercase">DevSecOps v1.0</span>
          </div>
        </div>

        <!-- Navigation Links -->
        <nav class="flex-1 p-4 space-y-2 mt-4">
          <a routerLink="/dashboard" routerLinkActive="bg-cyber-blue/10 text-cyber-cyan border-l-2 border-cyber-cyan" class="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-medium">
            <span>📊</span> Dashboard
          </a>
          <a routerLink="/upload" routerLinkActive="bg-cyber-blue/10 text-cyber-cyan border-l-2 border-cyber-cyan" class="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-medium">
            <span>📤</span> Upload Report
          </a>
          <a routerLink="/pull-requests" routerLinkActive="bg-cyber-blue/10 text-cyber-cyan border-l-2 border-cyber-cyan" class="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-medium">
            <span>🔀</span> Pull Requests
          </a>
        </nav>

        <!-- Profile / Logout -->
        <div class="p-4 border-t border-white/5 bg-[#06080d]">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-cyber-cyan uppercase">
              {{ apiService.currentUser()?.username?.[0] }}
            </div>
            <div>
              <p class="text-xs font-bold text-white">{{ apiService.currentUser()?.username }}</p>
              <p class="text-[10px] text-cyber-cyan font-mono">{{ apiService.currentUser()?.role }}</p>
            </div>
          </div>
          <button (click)="logout()" class="w-full py-2 bg-cyber-red/10 hover:bg-cyber-red/20 text-cyber-red text-xs font-semibold rounded-lg transition-all">
            Sign Out Session
          </button>
        </div>
      </aside>

      <!-- MAIN CONTENT PANEL -->
      <main class="flex-1 pl-64 min-h-screen bg-cyber-grid">
        <!-- Top bar -->
        <header class="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-[#05070B]/50 backdrop-blur-md">
          <div>
            <h2 class="text-xl font-extrabold text-white text-neon-blue">Dashboard Overview</h2>
            <p class="text-xs text-slate-400">Real-time vulnerability metrics and threat analysis</p>
          </div>
          <div class="flex items-center gap-4">
            <div class="px-3 py-1.5 rounded-full border border-cyber-green/30 bg-cyber-green/10 text-cyber-green text-xs font-mono flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-cyber-green animate-ping"></span>
              Secure Engine Active
            </div>
          </div>
        </header>

        <!-- Dashboard Content Grid -->
        <div class="p-8 space-y-8">
          
          <!-- Loading State -->
          @if (loading()) {
            <div class="min-h-[400px] flex flex-col items-center justify-center gap-4">
              <div class="w-12 h-12 border-4 border-cyber-blue border-t-transparent rounded-full animate-spin"></div>
              <p class="text-slate-400 text-sm font-mono animate-pulse">Syncing platform metrics...</p>
            </div>
          } @else {
            
            <!-- Dynamic Risk Dial & Summary Section -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              <!-- Risk Score Dial -->
              <div class="glass-card p-6 flex flex-col items-center justify-center text-center col-span-1 border border-white/5 relative overflow-hidden group">
                <div class="absolute -top-12 -left-12 w-32 h-32 bg-cyber-blue/5 rounded-full blur-3xl group-hover:bg-cyber-blue/10 transition-all duration-500"></div>
                
                <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Platform Risk Index</h3>
                
                <!-- SVG Animated Dial -->
                <div class="relative w-44 h-44 mb-4">
                  <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.03)" stroke-width="8" fill="transparent"/>
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      [attr.stroke]="getRiskColor(metrics()?.riskScore ?? 100)" 
                      stroke-width="8" 
                      fill="transparent"
                      stroke-linecap="round"
                      [attr.stroke-dasharray]="251.2"
                      [attr.stroke-dashoffset]="251.2 - (251.2 * (metrics()?.riskScore ?? 100)) / 100"
                      class="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div class="absolute inset-0 flex flex-col items-center justify-center">
                    <span class="text-4xl font-black text-white tracking-tight" [attr.style]="'color: ' + getRiskColor(metrics()?.riskScore ?? 100)">
                      {{ metrics()?.riskScore }}
                    </span>
                    <span class="text-[9px] uppercase tracking-wider font-semibold text-slate-400 mt-0.5">Health Score</span>
                  </div>
                </div>

                <div class="text-sm font-semibold mt-2" [attr.style]="'color: ' + getRiskColor(metrics()?.riskScore ?? 100)">
                  {{ getRiskStatusLabel(metrics()?.riskScore ?? 100) }}
                </div>
              </div>

              <!-- Metrics Cards Grid -->
              <div class="grid grid-cols-2 gap-4 lg:col-span-2">
                <!-- Critical -->
                <div class="glass-card p-5 border-l-4 border-cyber-red bg-gradient-to-r from-cyber-red/5 to-transparent flex flex-col justify-between hover:border-l-8 transition-all">
                  <div class="flex justify-between items-start">
                    <span class="text-slate-400 text-xs font-bold uppercase tracking-wider">Critical Vulns</span>
                    <span class="text-2xl">🚨</span>
                  </div>
                  <h4 class="text-4xl font-extrabold text-white mt-4">{{ metrics()?.criticalCount }}</h4>
                  <p class="text-[10px] text-slate-500 mt-2">Requires instant secure triage</p>
                </div>
                <!-- High -->
                <div class="glass-card p-5 border-l-4 border-cyber-yellow bg-gradient-to-r from-cyber-yellow/5 to-transparent flex flex-col justify-between hover:border-l-8 transition-all">
                  <div class="flex justify-between items-start">
                    <span class="text-slate-400 text-xs font-bold uppercase tracking-wider">High Vulns</span>
                    <span class="text-2xl">⚠️</span>
                  </div>
                  <h4 class="text-4xl font-extrabold text-white mt-4">{{ metrics()?.highCount }}</h4>
                  <p class="text-[10px] text-slate-500 mt-2">High severity risk components</p>
                </div>
                <!-- Medium / Low -->
                <div class="glass-card p-5 border-l-4 border-cyber-blue bg-gradient-to-r from-cyber-blue/5 to-transparent flex flex-col justify-between hover:border-l-8 transition-all">
                  <div class="flex justify-between items-start">
                    <span class="text-slate-400 text-xs font-bold uppercase tracking-wider">Medium / Low</span>
                    <span class="text-2xl">⚡</span>
                  </div>
                  <h4 class="text-4xl font-extrabold text-white mt-4">
                    {{ (metrics()?.mediumCount ?? 0) + (metrics()?.lowCount ?? 0) }}
                  </h4>
                  <p class="text-[10px] text-slate-500 mt-2">Minor application vulnerabilities</p>
                </div>
                <!-- Fixed -->
                <div class="glass-card p-5 border-l-4 border-cyber-green bg-gradient-to-r from-cyber-green/5 to-transparent flex flex-col justify-between hover:border-l-8 transition-all">
                  <div class="flex justify-between items-start">
                    <span class="text-slate-400 text-xs font-bold uppercase tracking-wider">Remediated (Fixed)</span>
                    <span class="text-2xl">🛡️</span>
                  </div>
                  <h4 class="text-4xl font-extrabold text-cyber-green mt-4 shadow-glow-green">{{ metrics()?.fixedCount }}</h4>
                  <p class="text-[10px] text-cyber-green mt-2 font-mono">Secured by CodeGuard AI</p>
                </div>
              </div>

            </div>

            <!-- Leaderboard and Scanned vulnerabilities -->
            <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
              
              <!-- Scanned Vulnerability Table -->
              <div class="glass-card p-6 xl:col-span-2 border border-white/5">
                <div class="flex justify-between items-center mb-6">
                  <div>
                    <h3 class="text-lg font-bold text-white">Active Scanned Vulnerabilities</h3>
                    <p class="text-xs text-slate-400">Interactive scan logs from mock Snyk scans</p>
                  </div>
                  @if (vulnerabilities().length === 0) {
                    <a routerLink="/upload" class="px-4 py-2 bg-cyber-blue/20 hover:bg-cyber-blue/30 text-cyber-blue border border-cyber-blue/30 rounded-xl text-xs font-bold transition-all">
                      Import Scan Report
                    </a>
                  }
                </div>

                @if (vulnerabilities().length === 0) {
                  <div class="min-h-[200px] flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/10 rounded-2xl">
                    <span class="text-3xl mb-3">🔍</span>
                    <h4 class="text-sm font-semibold text-white">No vulnerabilities scanned yet</h4>
                    <p class="text-xs text-slate-500 mt-1 max-w-sm">Please upload a Snyk JSON scan report or load the pre-packaged sample scan to begin.</p>
                  </div>
                } @else {
                  <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                      <thead>
                        <tr class="border-b border-white/5 text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                          <th class="pb-3">Vulnerability</th>
                          <th class="pb-3">Severity</th>
                          <th class="pb-3">File Location</th>
                          <th class="pb-3">Status</th>
                          <th class="pb-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-white/5 text-sm">
                        @for (vuln of vulnerabilities(); track vuln.id) {
                          <tr class="hover:bg-white/2.5 transition-all group">
                            <td class="py-4 pr-3 font-semibold text-white group-hover:text-cyber-cyan transition-all">
                              {{ vuln.title }}
                              <span class="block text-[10px] text-slate-500 font-mono mt-0.5">{{ vuln.snykId }}</span>
                            </td>
                            <td class="py-4">
                              <span 
                                class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                                [ngClass]="{
                                  'bg-cyber-red/10 text-cyber-red border border-cyber-red/35': vuln.severity === 'critical',
                                  'bg-cyber-yellow/10 text-cyber-yellow border border-cyber-yellow/35': vuln.severity === 'high',
                                  'bg-cyber-blue/10 text-cyber-blue border border-cyber-blue/35': vuln.severity === 'medium' || vuln.severity === 'low'
                                }"
                              >
                                {{ vuln.severity }}
                              </span>
                            </td>
                            <td class="py-4 text-xs font-mono text-slate-400 max-w-[220px]">
                              <div class="truncate">{{ vuln.filePath }}:L{{ vuln.lineNumber }}</div>
                              @if (vuln.pusherName) {
                                <div class="text-[10px] text-cyber-cyan mt-1 font-sans font-bold">Pusher: {{ vuln.pusherName }}</div>
                              }
                              @if (vuln.repo) {
                                <div class="text-[10px] text-slate-500 mt-0.5 truncate">{{ vuln.repo }} ({{ vuln.branch }})</div>
                              }
                            </td>
                            <td class="py-4">
                              <span 
                                class="flex items-center gap-1.5 text-xs font-mono font-medium"
                                [ngClass]="{
                                  'text-cyber-red': vuln.status === 'Open',
                                  'text-cyber-yellow': vuln.status === 'PRCreated',
                                  'text-cyber-green shadow-glow-green': vuln.status === 'Fixed'
                                }"
                              >
                                <span class="w-1.5 h-1.5 rounded-full" 
                                      [ngClass]="{
                                        'bg-cyber-red animate-pulse': vuln.status === 'Open',
                                        'bg-cyber-yellow animate-spin': vuln.status === 'PRCreated',
                                        'bg-cyber-green': vuln.status === 'Fixed'
                                      }">
                                </span>
                                {{ vuln.status }}
                              </span>
                            </td>
                            <td class="py-4 text-right">
                              @if (vuln.status === 'Open') {
                                <button (click)="openRemediation(vuln.id)" class="px-3.5 py-1.5 bg-gradient-to-r from-cyber-blue to-cyber-cyan hover:shadow-md hover:shadow-cyber-cyan/15 text-white text-xs font-bold rounded-lg transition-all">
                                  Remediate
                                </button>
                              } @else if (vuln.status === 'PRCreated') {
                                <a routerLink="/pull-requests" class="px-3.5 py-1.5 bg-cyber-yellow/10 hover:bg-cyber-yellow/20 text-cyber-yellow border border-cyber-yellow/30 text-xs font-bold rounded-lg transition-all inline-block">
                                  View PR
                                </a>
                              } @else {
                                <span class="text-cyber-green text-xs font-bold flex items-center justify-end gap-1">
                                  <span>✔️</span> Remediated
                                </span>
                              }
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </div>

              <!-- Leaderboard panel -->
              <div class="glass-card p-6 col-span-1 border border-white/5 flex flex-col justify-between">
                <div>
                  <h3 class="text-lg font-bold text-white mb-2">Secure Coding Leaderboard</h3>
                  <p class="text-xs text-slate-400 mb-6">Gamified security accomplishments ranked</p>
                  
                  <div class="space-y-4">
                    @for (dev of metrics()?.leaderboard; track dev.id) {
                      <div class="flex items-center gap-3 p-3 rounded-xl border border-white/2.5 bg-white/2 hover:border-white/5 transition-all">
                        <div class="w-7 h-7 flex items-center justify-center font-bold text-xs rounded-full"
                             [ngClass]="{
                               'bg-cyber-yellow/20 text-cyber-yellow border border-cyber-yellow/40': dev.rank === 1,
                               'bg-slate-400/20 text-slate-300 border border-slate-400/30': dev.rank === 2,
                               'bg-amber-600/20 text-amber-500 border border-amber-600/30': dev.rank === 3,
                               'bg-white/5 text-slate-400': dev.rank > 3
                             }">
                          #{{ dev.rank }}
                        </div>
                        <img [src]="dev.avatar" class="w-8 h-8 rounded-full bg-[#101524] border border-white/10" alt="avatar"/>
                        <div class="flex-1 min-w-0">
                          <p class="text-xs font-bold text-white truncate">{{ dev.name }}</p>
                          <div class="w-full bg-white/5 h-1.5 rounded-full mt-1.5 overflow-hidden">
                            <div class="bg-gradient-to-r from-cyber-blue to-cyber-cyan h-full rounded-full" 
                                 [style.width.%]="(dev.score / 1500) * 100">
                            </div>
                          </div>
                        </div>
                        <span class="text-xs font-mono font-bold text-cyber-cyan shadow-glow-cyan">{{ dev.score }} pts</span>
                      </div>
                    }
                  </div>
                </div>

                <div class="mt-6 pt-4 border-t border-white/5 text-center">
                  <p class="text-[10px] text-slate-500">Fix vulnerabilities and merge simulated PRs to earn points!</p>
                </div>
              </div>

            </div>

          }

        </div>
      </main>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  loading = signal(true);
  metrics = signal<DashboardMetrics | null>(null);
  vulnerabilities = signal<Vulnerability[]>([]);

  constructor(public apiService: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(): void {
    this.loading.set(true);
    this.apiService.getDashboardMetrics().subscribe({
      next: (m) => {
        this.metrics.set(m);
        
        // Fetch vulnerabilities too
        this.apiService.getVulnerabilities().subscribe({
          next: (v) => {
            this.vulnerabilities.set(v);
            this.loading.set(false);
          },
          error: () => this.loading.set(false)
        });
      },
      error: () => this.loading.set(false)
    });
  }

  logout(): void {
    this.apiService.logout();
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
