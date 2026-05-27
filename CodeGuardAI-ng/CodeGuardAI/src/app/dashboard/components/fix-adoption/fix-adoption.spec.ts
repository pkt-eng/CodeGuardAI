import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FixAdoption } from './fix-adoption';

describe('FixAdoption', () => {
  let component: FixAdoption;
  let fixture: ComponentFixture<FixAdoption>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FixAdoption]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FixAdoption);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
