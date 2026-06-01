import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { DashboardPayload } from '../models/dashboard.model';

export interface UserDto {
  id: number;
  username: string;
  role: string;
}

export interface LoginResponse {
  token: string;
  user: UserDto;
}

export interface Vulnerability {
  id: number;
  snykId: string;
  title: string;
  severity: string;
  filePath: string;
  lineNumber: number;
  vulnerableCode: string;
  secureCode: string;
  explanation: string;
  status: string;
  pullRequestId?: number;
  createdAt: string;
  repo?: string;
  commitSha?: string;
  runId?: string;
  pusherName?: string;
  pusherEmail?: string;
  classification?: string;
  branch?: string;
}

export interface PullRequest {
  id: number;
  title: string;
  sourceBranch: string;
  targetBranch: string;
  status: string;
  createdAt: string;
  mergedAt?: string;
  repo?: string;
  authorName?: string;
  authorEmail?: string;
  commitSha?: string;
}

export interface LeaderboardUser {
  id: number;
  name: string;
  avatar: string;
  score: number;
  rank: number;
}

export interface DashboardMetrics {
  riskScore: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  fixedCount: number;
  totalCount: number;
  leaderboard: LeaderboardUser[];
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
   private readonly baseUrl = 'http://localhost:5142/api';
   //private readonly baseUrl = ' https://president-appetizer-demanding.ngrok-free.dev/api';

  // Signals for state management
  readonly currentUser = signal<UserDto | null>(this.loadUserFromStorage());
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  constructor(private http: HttpClient) {}

  private loadUserFromStorage(): UserDto | null {
    const userJson = localStorage.getItem('cg_user');
    return userJson ? JSON.parse(userJson) : null;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('cg_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, { username, password }).pipe(
      tap(res => {
        localStorage.setItem('cg_token', res.token);
        localStorage.setItem('cg_user', JSON.stringify(res.user));
        this.currentUser.set(res.user);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('cg_token');
    localStorage.removeItem('cg_user');
    this.currentUser.set(null);
  }

  getDashboardMetrics(): Observable<DashboardMetrics> {
    return this.http.get<DashboardMetrics>(`${this.baseUrl}/dashboard/metrics`, { headers: this.getHeaders() });
  }

  getVulnerabilities(): Observable<Vulnerability[]> {
    return this.http.get<Vulnerability[]>(`${this.baseUrl}/vulnerability`, { headers: this.getHeaders() });
  }

  getVulnerability(id: number): Observable<Vulnerability> {
    return this.http.get<Vulnerability>(`${this.baseUrl}/vulnerability/${id}`, { headers: this.getHeaders() });
  }

  uploadSnykReport(vulnerabilities: any[]): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/vulnerability/upload`, { vulnerabilities }, { headers: this.getHeaders() });
  }

  remediateVulnerability(id: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/vulnerability/${id}/remediate`, {}, { headers: this.getHeaders() });
  }

  getPullRequests(): Observable<PullRequest[]> {
    return this.http.get<PullRequest[]>(`${this.baseUrl}/pullrequest`, { headers: this.getHeaders() });
  }

  getPullRequestDetails(id: number): Observable<{ pullRequest: PullRequest; vulnerability: Vulnerability }> {
    return this.http.get<{ pullRequest: PullRequest; vulnerability: Vulnerability }>(`${this.baseUrl}/pullrequest/${id}`, { headers: this.getHeaders() });
  }

  mergePullRequest(id: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/pullrequest/${id}/merge`, {}, { headers: this.getHeaders() });
  }

  getDashboardData(): Observable<DashboardPayload> {
    return this.http.get<DashboardPayload>(`${this.baseUrl}/dashboard/data`, { headers: this.getHeaders() });
  }
}
