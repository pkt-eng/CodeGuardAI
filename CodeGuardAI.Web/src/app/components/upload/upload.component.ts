import { Component, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-[#05070B] text-slate-100 flex font-sans">
      
      <!-- NAVIGATION SIDEBAR -->
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

      <!-- MAIN PANEL -->
      <main class="flex-1 pl-64 min-h-screen bg-cyber-grid">
        <header class="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-[#05070B]/50 backdrop-blur-md">
          <div>
            <h2 class="text-xl font-extrabold text-white text-neon-blue">Upload Threat Scan</h2>
            <p class="text-xs text-slate-400">Import structured Snyk scan reports to trigger AI remediation</p>
          </div>
        </header>

        <div class="p-8 max-w-4xl mx-auto space-y-8">
          
          <!-- Upload Card -->
          <div class="glass-card p-8 border border-white/5 relative overflow-hidden group">
            
            @if (parsing()) {
              <!-- Parsing Simulation Screen -->
              <div class="min-h-[350px] flex flex-col items-center justify-center text-center p-6 space-y-6">
                <div class="relative w-20 h-20">
                  <span class="absolute inset-0 border-4 border-cyber-blue/20 rounded-full"></span>
                  <span class="absolute inset-0 border-4 border-cyber-cyan border-t-transparent rounded-full animate-spin"></span>
                  <span class="absolute inset-0 flex items-center justify-center text-2xl">🤖</span>
                </div>
                <div>
                  <h3 class="text-lg font-bold text-white tracking-wider animate-pulse">CodeGuard AI Parsing Engine Active</h3>
                  <p class="text-xs text-slate-400 font-mono mt-2 min-h-[1.5rem]">
                    {{ parsingStep() }}
                  </p>
                </div>
                <div class="w-64 bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div class="bg-gradient-to-r from-cyber-blue to-cyber-cyan h-full rounded-full transition-all duration-300" 
                       [style.width.%]="parsingProgress()">
                  </div>
                </div>
              </div>
            } @else {
              
              <!-- Standard Drag-Drop Box -->
              <div class="border-2 border-dashed border-white/10 rounded-2xl p-12 text-center hover:border-cyber-blue/40 hover:bg-white/1 transition-all duration-300 relative cursor-pointer"
                   (click)="loadDemoReport()">
                <span class="text-5xl block mb-4">📄</span>
                <h3 class="text-lg font-bold text-white mb-2">Drag and Drop Snyk JSON Scan Report</h3>
                <p class="text-sm text-slate-400 max-w-md mx-auto mb-6">
                  Select a Snyk or Semgrep JSON vulnerability report from your disk. Or, click below to load our standard high-fidelity Demo report.
                </p>
                <div class="inline-flex py-3 px-6 bg-gradient-to-r from-cyber-blue to-cyber-cyan text-white text-xs font-bold rounded-xl shadow-lg shadow-cyber-blue/15 hover:-translate-y-0.5 transition-all">
                  Browse Scan Report
                </div>
              </div>

              <!-- Demo Report Generator Container -->
              <div class="mt-8 pt-6 border-t border-white/5 text-center">
                <p class="text-xs text-slate-500 mb-4">Running a live presentation or hackathon demo?</p>
                <button (click)="loadDemoReport()" class="px-6 py-3 bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-blue hover:bg-cyber-blue/20 text-sm font-bold rounded-xl transition-all shadow-glow-blue">
                  ⚡ Preload Sample Snyk Report
                </button>
              </div>

            }

          </div>

          <!-- JSON Content Viewer (shown when demo preloaded but before parsing) -->
          @if (selectedJson() && !parsing()) {
            <div class="glass-card p-6 border border-white/5 space-y-4 animate-fadeIn">
              <div class="flex justify-between items-center">
                <h4 class="text-sm font-bold text-white uppercase tracking-wider font-mono text-cyber-cyan">Preloaded Snyk payload ready</h4>
                <button (click)="submitScan()" class="px-6 py-2.5 bg-gradient-to-r from-cyber-green to-cyber-blue hover:shadow-lg hover:shadow-cyber-green/15 text-white text-xs font-bold rounded-xl transition-all">
                  🚀 Parse Scan Report
                </button>
              </div>
              <pre class="bg-[#080c14] border border-white/5 rounded-xl p-4 text-[11px] font-mono text-slate-400 overflow-x-auto max-h-[300px]">
{{ selectedJson() }}
              </pre>
            </div>
          }

        </div>
      </main>
    </div>
  `
})
export class UploadComponent {
  parsing = signal(false);
  parsingProgress = signal(0);
  parsingStep = signal('');
  selectedJson = signal<string | null>(null);

  constructor(public apiService: ApiService, private router: Router) {}

  logout(): void {
    this.apiService.logout();
    this.router.navigate(['/login']);
  }

  loadDemoReport(): void {
    const snykMockReport = {
      vulnerabilities: [
        {
          id: "SNYK-CSHARP-SQL-INJECTION-10293",
          title: "SQL Injection in User Lookup",
          severity: "critical",
          filePath: "Controllers/UserController.cs",
          lineNumber: 24,
          vulnerableCode: 'var query = "SELECT * FROM Users WHERE Username = \'" + inputUsername + "\'";\nvar cmd = new SqlCommand(query, conn);\nvar reader = cmd.ExecuteReader();'
        },
        {
          id: "SNYK-JS-LODASH-567480",
          title: "Prototype Pollution in deep-merge",
          severity: "high",
          filePath: "src/utils/helper.js",
          lineNumber: 12,
          vulnerableCode: 'function merge(target, source) {\n  for (let key in source) {\n    target[key] = source[key];\n  }\n  return target;\n}'
        },
        {
          id: "SNYK-JS-AXIOS-10294",
          title: "Cross-Site Scripting (XSS) injection",
          severity: "medium",
          filePath: "src/app/components/profile.component.ts",
          lineNumber: 45,
          vulnerableCode: 'this.profileElement.innerHTML = `<div class="user">Welcome, ${user.name}</div>`;'
        }
      ]
    };

    this.selectedJson.set(JSON.stringify(snykMockReport, null, 2));
  }

  submitScan(): void {
    if (!this.selectedJson()) return;

    const payload = JSON.parse(this.selectedJson()!);
    this.parsing.set(true);

    // Run high-fidelity hackathon animation steps!
    const steps = [
      { text: "Initializing threat detection database context...", delay: 600, progress: 15 },
      { text: "Loading Snyk report schema and security definitions...", delay: 1200, progress: 40 },
      { text: "De-duplicating vulnerabilities and extracting file locations...", delay: 1800, progress: 65 },
      { text: "Compiling vulnerable AST code blocks to engine pipeline...", delay: 2400, progress: 85 },
      { text: "Finishing analysis and seeding findings...", delay: 3000, progress: 100 }
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        this.parsingStep.set(step.text);
        this.parsingProgress.set(step.progress);

        if (idx === steps.length - 1) {
          // Trigger the REST API call to seed the DB
          this.apiService.uploadSnykReport(payload.vulnerabilities).subscribe({
            next: () => {
              setTimeout(() => {
                this.router.navigate(['/dashboard']);
              }, 400);
            },
            error: () => {
              this.parsing.set(false);
            }
          });
        }
      }, step.delay);
    });
  }
}
