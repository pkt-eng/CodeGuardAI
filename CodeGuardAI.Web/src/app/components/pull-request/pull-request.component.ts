import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService, PullRequest, Vulnerability } from '../../services/api.service';
import confetti from 'canvas-confetti';

@Component({
  selector: 'app-pull-request',
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
          <div>
            <h2 class="text-xl font-extrabold text-white text-neon-blue">Git Pull Requests</h2>
            <p class="text-xs text-slate-400 font-mono">Simulated Git Version Control integration</p>
          </div>
        </header>

        <div class="p-8 space-y-8">
          
          @if (!selectedPr()) {
            
            <!-- PR List View -->
            <div class="glass-card p-6 border border-white/5 space-y-6">
              <div>
                <h3 class="text-lg font-bold text-white">Active Pull Requests</h3>
                <p class="text-xs text-slate-400">Review and merge AI-generated secure remediations</p>
              </div>

              @if (prs().length === 0) {
                <div class="min-h-[220px] flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/10 rounded-2xl">
                  <span class="text-4xl mb-3">🔀</span>
                  <h4 class="text-sm font-semibold text-white">No active Pull Requests</h4>
                  <p class="text-xs text-slate-500 mt-1 max-w-sm">When you click 'Generate Secure Code Fix' on a vulnerability, a simulated Git Pull Request will be created here.</p>
                </div>
              } @else {
                <div class="divide-y divide-white/5">
                  @for (pr of prs(); track pr.id) {
                    <div (click)="selectPr(pr.id)" class="py-5 flex justify-between items-center hover:bg-white/2.5 px-4 rounded-xl cursor-pointer group transition-all">
                      <div class="flex items-start gap-3">
                        <span class="text-2xl mt-0.5" [ngClass]="pr.status === 'Merged' ? 'text-cyber-purple' : 'text-cyber-green'">
                          {{ pr.status === 'Merged' ? '✔️' : '🔀' }}
                        </span>
                        <div>
                          <h4 class="text-sm font-bold text-white group-hover:text-cyber-cyan transition-all">{{ pr.title }}</h4>
                          <div class="flex items-center gap-2 mt-1.5 text-xs text-slate-400 font-mono">
                            <span class="px-1.5 py-0.5 rounded bg-white/5 text-slate-400">#PR-0{{ pr.id }}</span>
                            <span>•</span>
                            <span>{{ pr.sourceBranch }}</span> <span>➡️</span> <span>{{ pr.targetBranch }}</span>
                            <span>•</span>
                            <span>{{ pr.createdAt | date:'mediumTime' }}</span>
                          </div>
                        </div>
                      </div>

                      <div class="flex items-center gap-3">
                        <span 
                          class="px-2.5 py-1 rounded-lg text-xs font-mono font-bold"
                          [ngClass]="{
                            'bg-cyber-green/10 text-cyber-green border border-cyber-green/35': pr.status === 'Open',
                            'bg-cyber-purple/10 text-cyber-purple border border-cyber-purple/35': pr.status === 'Merged'
                          }"
                        >
                          {{ pr.status }}
                        </span>
                        <span class="text-slate-500 group-hover:text-white transition-all">➡️</span>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

          } @else {
            
            <!-- Pull Request Interactive Detail View (GitHub Style!) -->
            <div class="space-y-6 animate-fadeIn">
              
              <!-- Back button & Header info -->
              <div class="flex items-center justify-between">
                <button (click)="deselectPr()" class="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-all flex items-center gap-1.5">
                  ⬅️ Back to PR list
                </button>
                <div class="flex items-center gap-3">
                  <span 
                    class="px-2.5 py-1 rounded-lg text-xs font-mono font-bold"
                    [ngClass]="{
                      'bg-cyber-green/15 text-cyber-green border border-cyber-green/35': selectedPr()?.status === 'Open',
                      'bg-cyber-purple/15 text-cyber-purple border border-cyber-purple/35': selectedPr()?.status === 'Merged'
                    }"
                  >
                    {{ selectedPr()?.status }}
                  </span>
                </div>
              </div>

              <!-- Main PR Card -->
              <div class="glass-card p-6 border border-white/5 space-y-4">
                <h3 class="text-xl font-extrabold text-white flex items-center gap-2">
                  {{ selectedPr()?.title }}
                </h3>
                <div class="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <span class="font-bold text-cyber-cyan">{{ selectedPr()?.authorName || 'admin' }}</span>
                  <span>wants to merge 1 commit into</span>
                  <span class="px-1.5 py-0.5 rounded bg-white/5 font-bold text-white">{{ selectedPr()?.targetBranch }}</span>
                  <span>from</span>
                  <span class="px-1.5 py-0.5 rounded bg-white/5 font-bold text-white">{{ selectedPr()?.sourceBranch }}</span>
                </div>
              </div>

              <!-- Tabs: Conversation vs Files Changed -->
              <div class="flex border-b border-white/5 gap-4">
                <button (click)="activeTab.set('conversation')" 
                        class="pb-3 text-sm font-bold transition-all relative border-b-2"
                        [ngClass]="activeTab() === 'conversation' ? 'text-cyber-cyan border-cyber-cyan font-bold' : 'text-slate-400 border-transparent hover:text-white'">
                  💬 Conversation
                </button>
                <button (click)="activeTab.set('files')" 
                        class="pb-3 text-sm font-bold transition-all relative border-b-2"
                        [ngClass]="activeTab() === 'files' ? 'text-cyber-cyan border-cyber-cyan font-bold' : 'text-slate-400 border-transparent hover:text-white'">
                  📂 Files Changed (1)
                </button>
              </div>

              <!-- Conversation Tab Content -->
              @if (activeTab() === 'conversation') {
                <div class="space-y-6 animate-fadeIn">
                  
                  <!-- Thread Item: AI Agent bot comment -->
                  <div class="glass-card border border-white/5 overflow-hidden">
                    <div class="p-4 bg-[#090d16] border-b border-white/5 flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyber-blue to-cyber-cyan flex items-center justify-center font-bold text-[10px]">AI</div>
                        <span class="text-xs font-bold text-white">CodeGuard AI Agent</span>
                        <span class="text-[10px] text-slate-500 font-mono uppercase bg-white/5 px-1.5 py-0.2 rounded">Bot</span>
                      </div>
                      <span class="text-[10px] text-slate-400 font-mono">Simulated review</span>
                    </div>

                    <div class="p-6 space-y-4">
                      <p class="text-sm text-slate-300 leading-relaxed">
                        I have audited the code block in <span class="font-mono text-cyber-cyan">{{ linkedVuln()?.filePath }}</span> and applied a secure refactoring pattern.
                      </p>
                      
                      <div class="p-4 rounded-xl bg-[#080c14] border border-white/5 border-l-4 border-cyber-cyan">
                        <h4 class="text-xs font-bold text-white uppercase tracking-wider mb-1">Audit Findings Summary</h4>
                        <p class="text-xs text-slate-400">{{ linkedVuln()?.explanation }}</p>
                      </div>

                      <p class="text-sm text-slate-300">
                        This suggestion has been compiled, checked against active static analysis tools, and passed security assertions. Review the changes under the <strong>Files Changed</strong> tab and click below to approve and merge.
                      </p>
                    </div>
                  </div>

                  <!-- Merge box card -->
                  <div class="glass-card p-6 border border-white/5 border-l-4"
                       [ngClass]="selectedPr()?.status === 'Merged' ? 'border-cyber-purple bg-cyber-purple/5' : 'border-cyber-green bg-cyber-green/5'">
                    
                    @if (selectedPr()?.status === 'Open') {
                      
                      @if (mergeLoading()) {
                        <div class="flex items-center gap-3">
                          <span class="w-6 h-6 border-3 border-cyber-green border-t-transparent rounded-full animate-spin"></span>
                          <div>
                            <h4 class="text-sm font-bold text-white animate-pulse">Running Merge Pipeline...</h4>
                            <p class="text-xs text-slate-400 font-mono mt-0.5">{{ mergeStep() }}</p>
                          </div>
                        </div>
                      } @else {
                        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <h4 class="text-sm font-extrabold text-white flex items-center gap-1.5">
                              <span>🛡️</span> All checks passed successfully
                            </h4>
                            <p class="text-xs text-slate-400 mt-1">1 secure audit assertion passed. Ready for immediate deployment.</p>
                          </div>
                          <button (click)="triggerMerge()" class="px-6 py-3 bg-gradient-to-r from-cyber-green to-cyber-blue hover:shadow-lg hover:shadow-cyber-green/15 text-white font-extrabold rounded-xl transition-all shadow-glow-green text-sm hover:-translate-y-0.5">
                            Approve & Merge PR
                          </button>
                        </div>
                      }

                    } @else {
                      <div class="flex items-center justify-between">
                        <div>
                          <h4 class="text-sm font-extrabold text-cyber-purple flex items-center gap-1.5">
                            <span>✔️</span> Pull Request Merged
                          </h4>
                          <p class="text-xs text-slate-400 mt-1">Simulated commit merged into main branch on {{ selectedPr()?.mergedAt | date:'medium' }}.</p>
                        </div>
                        <div class="px-4 py-2 bg-cyber-purple/10 border border-cyber-purple/30 text-cyber-purple rounded-xl font-bold text-xs font-mono">
                          +100 Points Awarded (John Doe)
                        </div>
                      </div>
                    }

                  </div>

                </div>
              }

              <!-- Files Changed Tab Content -->
              @if (activeTab() === 'files') {
                <div class="glass-card border border-white/5 overflow-hidden flex flex-col animate-fadeIn">
                  <div class="p-4 bg-[#090d16] border-b border-white/5 flex items-center justify-between">
                    <span class="text-xs font-mono font-bold text-slate-400">{{ linkedVuln()?.filePath }}</span>
                    <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-cyber-green/15 text-cyber-green font-bold">1 file changed</span>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5 font-mono text-xs">
                    
                    <!-- Original -->
                    <div class="flex flex-col bg-cyber-red/2.5">
                      <div class="p-3 bg-cyber-red/5 border-b border-white/5 font-semibold text-cyber-red text-center uppercase tracking-wider text-[10px]">
                        Original Line Blocks
                      </div>
                      <pre class="p-6 overflow-x-auto text-slate-300 whitespace-pre leading-relaxed min-h-[220px] bg-[#070a10]">{{ linkedVuln()?.vulnerableCode }}</pre>
                    </div>

                    <!-- Secure -->
                    <div class="flex flex-col bg-cyber-green/2.5">
                      <div class="p-3 bg-cyber-green/5 border-b border-white/5 font-semibold text-cyber-green text-center uppercase tracking-wider text-[10px]">
                        Secure Remediated Blocks
                      </div>
                      <pre class="p-6 overflow-x-auto text-slate-200 whitespace-pre leading-relaxed min-h-[220px] bg-[#070a10]">{{ linkedVuln()?.secureCode }}</pre>
                    </div>

                  </div>
                </div>
              }

            </div>
          }

        </div>
      </main>
    </div>
  `
})
export class PullRequestComponent implements OnInit {
  prs = signal<PullRequest[]>([]);
  selectedPr = signal<PullRequest | null>(null);
  linkedVuln = signal<Vulnerability | null>(null);
  activeTab = signal<'conversation' | 'files'>('conversation');

  mergeLoading = signal(false);
  mergeStep = signal('');

  constructor(public apiService: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.fetchPullRequests();
  }

  fetchPullRequests(): void {
    this.apiService.getPullRequests().subscribe({
      next: (data) => this.prs.set(data)
    });
  }

  logout(): void {
    this.apiService.logout();
    this.router.navigate(['/login']);
  }

  selectPr(id: number): void {
    this.apiService.getPullRequestDetails(id).subscribe({
      next: (res) => {
        this.selectedPr.set(res.pullRequest);
        this.linkedVuln.set(res.vulnerability);
        this.activeTab.set('conversation');
      }
    });
  }

  deselectPr(): void {
    this.selectedPr.set(null);
    this.linkedVuln.set(null);
    this.fetchPullRequests();
  }

  triggerMerge(): void {
    if (!this.selectedPr()) return;

    this.mergeLoading.set(true);

    const steps = [
      { text: "Verifying secure code assertions...", delay: 600 },
      { text: "Executing container compilation checks...", delay: 1200 },
      { text: "Merging commit into main branch...", delay: 1800 },
      { text: "Securing deployment hooks and updating ranks...", delay: 2400 }
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        this.mergeStep.set(step.text);

        if (idx === steps.length - 1) {
          this.apiService.mergePullRequest(this.selectedPr()!.id).subscribe({
            next: (res) => {
              this.mergeLoading.set(false);
              this.selectedPr.set(res.pullRequest);
              
              // Confetti celebration!!!
              confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 }
              });

              // Also trigger a minor delay burst
              setTimeout(() => {
                confetti({
                  particleCount: 100,
                  spread: 120,
                  origin: { y: 0.5 }
                });
              }, 300);
            },
            error: () => this.mergeLoading.set(false)
          });
        }
      }, step.delay);
    });
  }
}
