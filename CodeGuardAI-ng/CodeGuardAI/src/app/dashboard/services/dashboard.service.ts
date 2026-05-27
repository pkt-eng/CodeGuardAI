import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { DashboardPayload } from '../models/dashboard.model';
import { mockDashboardData } from '../models/dashboard.data';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  
  constructor() { }

  getDashboardData(): Observable<DashboardPayload> {
    // Simulating an API call to fetch the data
    return of(mockDashboardData);
  }
}