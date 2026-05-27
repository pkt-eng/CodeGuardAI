import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RiskOverview } from './risk-overview';

describe('RiskOverview', () => {
  let component: RiskOverview;
  let fixture: ComponentFixture<RiskOverview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskOverview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RiskOverview);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
