import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen cyber-grid flex items-center justify-center p-4 relative overflow-hidden bg-[#05070B]">
      <!-- Tech Background Glows -->
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-cyber-blue/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyber-purple/10 rounded-full blur-[120px] pointer-events-none"></div>

      <!-- Login Glass Card -->
      <div class="w-full max-w-md glass-card p-8 border border-white/10 relative z-10 transition-all duration-500 hover:border-cyber-blue/30 shadow-glow-blue">
        
        <!-- Logo Section -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyber-blue to-cyber-purple p-0.5 mb-4 shadow-lg shadow-cyber-blue/20">
            <div class="w-full h-full bg-[#0d121d] rounded-2xl flex items-center justify-center">
              <span class="material-icons text-transparent bg-clip-text bg-gradient-to-r from-cyber-blue to-cyber-cyan text-3xl font-extrabold">CG</span>
            </div>
          </div>
          <h1 class="text-3xl font-extrabold tracking-tight text-white mb-2">
            CodeGuard <span class="text-transparent bg-clip-text bg-gradient-to-r from-cyber-blue via-cyber-cyan to-cyber-purple">AI</span>
          </h1>
          <p class="text-sm text-slate-400">Autonomous DevSecOps & AI Remediation</p>
        </div>

        <!-- Form Section -->
        <form (ngSubmit)="onSubmit()" #loginForm="ngForm" class="space-y-6">
          <!-- Error alert -->
          @if (errorMessage()) {
            <div class="bg-cyber-red/10 border border-cyber-red/30 rounded-xl p-3 text-sm text-cyber-red flex items-center gap-2 animate-pulse">
              <span>⚠️</span> {{ errorMessage() }}
            </div>
          }

          <!-- Username Input -->
          <div>
            <label for="username" class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Developer Identifier</label>
            <div class="relative">
              <input
                type="text"
                id="username"
                name="username"
                [(ngModel)]="username"
                required
                class="w-full bg-[#0b0e14] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyber-blue focus:ring-1 focus:ring-cyber-blue/30 transition-all duration-300 text-sm"
                placeholder="e.g. admin"
              />
            </div>
          </div>

          <!-- Password Input -->
          <div>
            <label for="password" class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Access Token (Password)</label>
            <div class="relative">
              <input
                type="password"
                id="password"
                name="password"
                [(ngModel)]="password"
                required
                class="w-full bg-[#0b0e14] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyber-blue focus:ring-1 focus:ring-cyber-blue/30 transition-all duration-300 text-sm"
                placeholder="e.g. admin123"
              />
            </div>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            [disabled]="loading() || !loginForm.valid"
            class="w-full py-3.5 px-4 bg-gradient-to-r from-cyber-blue via-cyber-cyan to-cyber-purple hover:from-cyber-purple hover:via-cyber-cyan hover:to-cyber-blue text-white font-bold rounded-xl shadow-lg hover:shadow-cyber-cyan/20 focus:outline-none transition-all duration-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
          >
            @if (loading()) {
              <div class="flex items-center justify-center gap-2">
                <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Authenticating...</span>
              </div>
            } @else {
              <span>Authenticate & Initialize</span>
            }
          </button>
        </form>

        <!-- Mock details card for hackathon -->
        <div class="mt-8 pt-6 border-t border-white/5 text-center">
          <p class="text-xs text-slate-500">
            Hackathon Presentation Credentials:<br>
            <span class="text-cyber-cyan font-mono">admin</span> / <span class="text-cyber-cyan font-mono">admin123</span>
          </p>
        </div>

      </div>
    </div>
  `
})
export class LoginComponent {
  username = '';
  password = '';
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  constructor(private apiService: ApiService, private router: Router) {
    if (this.apiService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit(): void {
    if (!this.username || !this.password) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    this.apiService.login(this.username, this.password).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Authentication failed. Please verify credentials.');
      }
    });
  }
}
