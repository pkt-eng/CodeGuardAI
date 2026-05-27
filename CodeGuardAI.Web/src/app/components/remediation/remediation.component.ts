import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService, Vulnerability } from '../../services/api.service';

@Component({
  selector: 'app-reremediation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-[#05070B] text-slate-100 flex font-sans">
      
      <!-- SIDEBAR -->
      <aside class="w-64 border-r border-white/5 bg-[#080B11]/90 flex flex-col fixed h-full z-20">
        <div class="p-6 border-b border-white/5 flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyber-blue to-cyber-cyan p-0.5 shadow-md shadow-cyber-blue/15 flex items-center justify-center">
            <span class="font-extrabold text-white text-lg">CG</span>
          </div>
          <div>
            <h1 class="text-md font-bold tracking-wider text-white">CodeGuard <span class="text-cyber-cyan">AI</span></h1>
            <span class="text-[10px] text-slate-500 font-mono tracking-widest uppercase">DevSecOps v1.0</span>
          </div>
        </div>

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

      <!-- MAIN CONTENT -->
      <main class="flex-1 pl-64 min-h-screen bg-cyber-grid">
        <header class="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-[#05070B]/50 backdrop-blur-md">
          <div class="flex items-center gap-4">
            <a routerLink="/dashboard" class="text-slate-400 hover:text-white transition-all text-sm">⬅️ Dashboard</a>
            <span class="text-slate-600">/</span>
            <h2 class="text-lg font-bold text-white">Vulnerability Remediation</h2>
          </div>
        </header>

        <div class="p-8 space-y-8">
          
          <!-- Vulnerability Details header card -->
          @if (vuln()) {
            <div class="glass-card p-6 border-l-4 border-cyber-red">
              <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div class="flex items-center gap-3 mb-2">
                    <span 
                      class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase"
                      [ngClass]="{
                        'bg-cyber-red/10 text-cyber-red border border-cyber-red/35': vuln()?.severity === 'critical',
                        'bg-cyber-yellow/10 text-cyber-yellow border border-cyber-yellow/35': vuln()?.severity === 'high',
                        'bg-cyber-blue/10 text-cyber-blue border border-cyber-blue/35': vuln()?.severity === 'medium' || vuln()?.severity === 'low'
                      }"
                    >
                      {{ vuln()?.severity }}
                    </span>
                    <span class="text-xs font-mono text-slate-400">{{ vuln()?.snykId }}</span>
                  </div>
                  <h3 class="text-xl font-extrabold text-white">{{ vuln()?.title }}</h3>
                  <div class="text-xs text-slate-400 mt-1 font-mono flex flex-wrap gap-x-4 gap-y-1">
                    <span>Location: {{ vuln()?.filePath }}:L{{ vuln()?.lineNumber }}</span>
                    @if (vuln()?.repo) {
                      <span>Repo: {{ vuln()?.repo }}</span>
                      <span>Branch: {{ vuln()?.branch }}</span>
                    }
                    @if (vuln()?.pusherName) {
                      <span class="text-cyber-cyan">Pusher: {{ vuln()?.pusherName }}</span>
                    }
                    @if (vuln()?.commitSha) {
                      <span>Commit: {{ vuln()?.commitSha?.substring(0,7) }}</span>
                    }
                  </div>
                </div>

                @if (vuln()?.status === 'Open') {
                  <button (click)="triggerRemediation()" 
                          [disabled]="aiLoading()"
                          class="px-6 py-3.5 bg-gradient-to-r from-cyber-blue via-cyber-cyan to-cyber-purple hover:from-cyber-purple hover:to-cyber-blue text-white font-bold rounded-xl shadow-lg hover:shadow-cyber-cyan/20 transition-all duration-500 text-sm flex items-center gap-2 hover:-translate-y-0.5 disabled:opacity-50">
                    <span>✨</span> Generate Secure Code Fix
                  </button>
                } @else if (vuln()?.status === 'PRCreated') {
                  <button (click)="openPullRequest()" 
                          class="px-6 py-3.5 bg-cyber-yellow hover:bg-cyber-yellow/90 text-[#05070B] font-bold rounded-xl shadow-lg hover:shadow-cyber-yellow/20 transition-all duration-500 text-sm flex items-center gap-2 hover:-translate-y-0.5">
                    <span>🔀</span> Open Simulated PR
                  </button>
                } @else {
                  <div class="px-5 py-2.5 rounded-xl border border-cyber-green/30 bg-cyber-green/10 text-cyber-green font-bold text-sm flex items-center gap-2">
                    <span>✔️</span> Remediated in Pull Request
                  </div>
                }
              </div>
            </div>
          }

          <!-- Loading state during AI generation -->
          @if (aiLoading()) {
            <div class="glass-card p-12 text-center flex flex-col items-center justify-center space-y-6">
              <div class="relative w-16 h-16">
                <span class="absolute inset-0 border-4 border-cyber-purple/20 rounded-full"></span>
                <span class="absolute inset-0 border-4 border-cyber-purple border-t-transparent rounded-full animate-spin"></span>
                <span class="absolute inset-0 flex items-center justify-center text-xl">🧠</span>
              </div>
              <div>
                <h4 class="text-base font-bold text-white animate-pulse">Consulting Azure OpenAI (gpt-4.1-mini)...</h4>
                <p class="text-xs text-slate-400 font-mono mt-2 min-h-[1.5rem]">{{ loadingStep() }}</p>
              </div>
              <div class="w-64 bg-white/5 h-1.5 rounded-full overflow-hidden">
                <div class="bg-gradient-to-r from-cyber-purple to-cyber-pink h-full rounded-full animate-pulse" style="width: 100%"></div>
              </div>
            </div>
          }

          <!-- Remediation comparison grid -->
          @if (vuln()?.secureCode && !aiLoading()) {
            <div class="grid grid-cols-1 gap-8 animate-fadeIn">
              
              <!-- Explanation Box -->
              <div class="glass-card p-6 border border-white/5 bg-gradient-to-r from-cyber-cyan/5 to-transparent">
                <h4 class="text-sm font-bold text-white uppercase tracking-wider mb-2 text-cyber-cyan flex items-center gap-2">
                  <span>🧠</span> AI Security Analysis & remediation
                </h4>
                <p class="text-sm text-slate-300 leading-relaxed">
                  {{ vuln()?.explanation }}
                </p>
              </div>

              <!-- Side-by-side Code Comparison -->
              <div class="glass-card border border-white/5 overflow-hidden flex flex-col">
                <div class="p-4 bg-[#090d16] border-b border-white/5 flex items-center justify-between">
                  <span class="text-xs font-mono font-bold text-slate-400">{{ vuln()?.filePath }}</span>
                  <span class="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400">Interactive Diff Viewer</span>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5 font-mono text-xs">
                  
                  <!-- Left side: Vulnerable code -->
                  <div class="flex flex-col bg-cyber-red/2.5">
                    <div class="p-3 bg-cyber-red/5 border-b border-white/5 font-semibold text-cyber-red text-center uppercase tracking-wider text-[10px]">
                      🔴 Vulnerable Code Block
                    </div>
                    <pre class="p-6 overflow-x-auto text-slate-300 whitespace-pre leading-relaxed min-h-[180px] bg-[#070a10]">{{ vuln()?.vulnerableCode }}</pre>
                  </div>

                  <!-- Right side: Secure code -->
                  <div class="flex flex-col bg-cyber-green/2.5">
                    <div class="p-3 bg-cyber-green/5 border-b border-white/5 font-semibold text-cyber-green text-center uppercase tracking-wider text-[10px]">
                      🟢 AI Remediation (Secure)
                    </div>
                    <pre class="p-6 overflow-x-auto text-slate-200 whitespace-pre leading-relaxed min-h-[180px] bg-[#070a10]">{{ vuln()?.secureCode }}</pre>
                  </div>

                </div>
              </div>

              <!-- Simulated PR trigger -->
              @if (vuln()?.status === 'PRCreated') {
                <div class="text-center pt-4">
                  <button (click)="openPullRequest()" class="px-8 py-4 bg-gradient-to-r from-cyber-yellow to-cyber-purple hover:shadow-lg hover:shadow-cyber-yellow/20 text-[#05070B] hover:text-white font-extrabold rounded-xl transition-all duration-500 hover:-translate-y-0.5 text-base flex items-center gap-2.5 mx-auto">
                    <span>🔀</span> Simulate Pull Request Suggestions
                  </button>
                </div>
              }

            </div>
          } @else if (!vuln()?.secureCode && !aiLoading()) {
            <!-- Empty state prior to AI click -->
            <div class="glass-card p-12 text-center border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center">
              <span class="text-5xl block mb-4">🛡️</span>
              <h4 class="text-base font-bold text-white mb-2">AI secure remediation engine is ready</h4>
              <p class="text-xs text-slate-400 max-w-md mx-auto mb-6">
                Click the 'Generate Secure Code Fix' button above. CodeGuard AI will query the Azure OpenAI integration to analyze, refactor, and produce highly secure, production-ready source code changes.
              </p>
            </div>
          }

        </div>
      </main>
    </div>
  `
})
export class RemediationComponent implements OnInit {
  vulnId = 0;
  vuln = signal<Vulnerability | null>(null);
  aiLoading = signal(false);
  loadingStep = signal('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.vulnId = +params['id'];
      this.fetchVulnerability();
    });
  }

  fetchVulnerability(): void {
    this.apiService.getVulnerability(this.vulnId).subscribe({
      next: (v) => this.vuln.set(v),
      error: () => this.router.navigate(['/dashboard'])
    });
  }

  logout(): void {
    this.apiService.logout();
    this.router.navigate(['/login']);
  }

  triggerRemediation(): void {
    this.aiLoading.set(true);

    const steps = [
      { text: "Reading file signatures and threat details...", delay: 600 },
      { text: "Executing secure coding context prompts...", delay: 1200 },
      { text: "Azure OpenAI gpt-4.1-mini analyzing AST...", delay: 1800 },
      { text: "Synthesizing secure remediation and explanations...", delay: 2400 },
      { text: "Applying changes to repository and simulating PR...", delay: 3000 }
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        this.loadingStep.set(step.text);

        if (idx === steps.length - 1) {
          this.apiService.remediateVulnerability(this.vulnId).subscribe({
            next: (res) => {
              this.aiLoading.set(false);
              this.vuln.set(res.vulnerability);
            },
            error: () => this.aiLoading.set(false)
          });
        }
      }, step.delay);
    });
  }

  openPullRequest(): void {
    this.router.navigate(['/pull-requests']);
  }
}
