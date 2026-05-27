import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MttrSavings } from './mttr-savings';

describe('MttrSavings', () => {
  let component: MttrSavings;
  let fixture: ComponentFixture<MttrSavings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MttrSavings]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MttrSavings);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
