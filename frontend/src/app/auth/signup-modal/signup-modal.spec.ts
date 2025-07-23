import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SignupModal } from './signup-modal';

describe('SignupModal', () => {
  let component: SignupModal;
  let fixture: ComponentFixture<SignupModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignupModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SignupModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
