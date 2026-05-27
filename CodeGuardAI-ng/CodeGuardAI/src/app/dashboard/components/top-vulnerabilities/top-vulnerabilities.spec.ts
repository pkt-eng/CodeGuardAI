import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopVulnerabilities } from './top-vulnerabilities';

describe('TopVulnerabilities', () => {
  let component: TopVulnerabilities;
  let fixture: ComponentFixture<TopVulnerabilities>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopVulnerabilities]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TopVulnerabilities);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
