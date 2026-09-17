import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError, Subject } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../services/auth.service';
import { LOCKOUT_MESSAGES } from '../shared/constants/lockout-messages.constants';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['requestOtp']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // --- AI Disclaimer ---

  it('should render the AI disclaimer on init and never hide it', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const disclaimer = compiled.querySelector('.ai-disclaimer');
    expect(disclaimer).toBeTruthy();
    expect(disclaimer!.textContent).toContain(
      'This portal uses AI to assist with clinical intake'
    );
  });

  it('should render the AI disclaimer outside any conditional (always present in DOM)', () => {
    // Verify it is a top-level element, not nested inside an *ngIf wrapper
    const compiled = fixture.nativeElement as HTMLElement;
    const disclaimer = compiled.querySelector('.ai-disclaimer');
    expect(disclaimer).toBeTruthy();
    // Disclaimer should NOT be inside the login-container
    const container = compiled.querySelector('.login-container');
    expect(container!.contains(disclaimer)).toBeFalse();
  });

  // --- Initial state ---

  it('should initialize with identifierType = "mrNumber"', () => {
    expect(component.identifierType).toBe('mrNumber');
  });

  it('should initialize with empty identifierValue', () => {
    expect(component.loginForm.get('identifierValue')?.value).toBe('');
  });

  it('should initialize with isLoading = false', () => {
    expect(component.isLoading).toBeFalse();
  });

  it('should initialize with apiError = null', () => {
    expect(component.apiError).toBeNull();
  });

  // --- Toggle behaviour ---

  it('should switch to phone type when phone toggle is clicked', () => {
    component.switchType('phone');
    expect(component.identifierType).toBe('phone');
  });

  it('should switch back to mrNumber type when MR toggle is clicked', () => {
    component.switchType('phone');
    component.switchType('mrNumber');
    expect(component.identifierType).toBe('mrNumber');
  });

  it('should clear identifierValue when switching identifier type', () => {
    component.loginForm.get('identifierValue')?.setValue('MR1234567');
    component.switchType('phone');
    expect(component.loginForm.get('identifierValue')?.value).toBe('');
  });

  it('should clear apiError when switching identifier type', () => {
    component.apiError = 'Some error';
    component.switchType('phone');
    expect(component.apiError).toBeNull();
  });

  it('should NOT call authService.requestOtp when switching identifier type', () => {
    component.loginForm.get('identifierValue')?.setValue('MR1234567');
    component.switchType('phone');
    expect(authServiceSpy.requestOtp).not.toHaveBeenCalled();
  });

  // --- Validation: required ---

  it('should show a required error when submitting with empty identifierValue', () => {
    component.loginForm.get('identifierValue')?.setValue('');
    component.onSubmit();
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('.error');
    expect(errorEl).toBeTruthy();
    expect(errorEl.textContent).toContain('Please enter your');
  });

  it('should not call requestOtp when form is invalid on submit', () => {
    component.loginForm.get('identifierValue')?.setValue('');
    component.onSubmit();
    expect(authServiceSpy.requestOtp).not.toHaveBeenCalled();
  });

  // --- Validation: MR number pattern ---

  it('should show a pattern error when MR number does not match /^MR\\d{7}$/ (e.g. "ABC123")', () => {
    component.identifierType = 'mrNumber';
    component.loginForm.get('identifierValue')?.setValue('ABC123');
    component.loginForm.get('identifierValue')?.markAsTouched();
    component.loginForm.get('identifierValue')?.updateValueAndValidity();
    fixture.detectChanges();

    const ctrl = component.loginForm.get('identifierValue');
    expect(ctrl?.errors?.['pattern']).toBeTrue();
  });

  it('should show a pattern error for MR number without MR prefix (e.g. "1234567")', () => {
    component.identifierType = 'mrNumber';
    component.loginForm.get('identifierValue')?.setValue('1234567');
    component.loginForm.get('identifierValue')?.markAsTouched();
    component.loginForm.get('identifierValue')?.updateValueAndValidity();

    const ctrl = component.loginForm.get('identifierValue');
    expect(ctrl?.errors?.['pattern']).toBeTrue();
  });

  it('should accept a valid MR number matching /^MR\\d{7}$/ (e.g. "MR1234567")', () => {
    component.identifierType = 'mrNumber';
    component.loginForm.get('identifierValue')?.setValue('MR1234567');
    component.loginForm.get('identifierValue')?.updateValueAndValidity();

    const ctrl = component.loginForm.get('identifierValue');
    expect(ctrl?.errors).toBeNull();
  });

  // --- Validation: phone pattern ---

  it('should show a pattern error when phone number starts with 1 (e.g. "1234567890")', () => {
    component.identifierType = 'phone';
    const ctrl = component.loginForm.get('identifierValue');
    ctrl?.setValidators([
      // re-trigger validator after type switch
    ]);
    component.switchType('phone');
    component.loginForm.get('identifierValue')?.setValue('1234567890');
    component.loginForm.get('identifierValue')?.markAsTouched();
    component.loginForm.get('identifierValue')?.updateValueAndValidity();

    expect(component.loginForm.get('identifierValue')?.errors?.['pattern']).toBeTrue();
  });

  it('should show a pattern error when phone number is too short (e.g. "987654321" — 9 digits)', () => {
    component.switchType('phone');
    component.loginForm.get('identifierValue')?.setValue('987654321');
    component.loginForm.get('identifierValue')?.markAsTouched();
    component.loginForm.get('identifierValue')?.updateValueAndValidity();

    expect(component.loginForm.get('identifierValue')?.errors?.['pattern']).toBeTrue();
  });

  it('should accept a valid phone number starting with 6-9 (e.g. "9876543210")', () => {
    component.switchType('phone');
    component.loginForm.get('identifierValue')?.setValue('9876543210');
    component.loginForm.get('identifierValue')?.updateValueAndValidity();

    expect(component.loginForm.get('identifierValue')?.errors).toBeNull();
  });

  // --- Submit behaviour ---

  it('should call authService.requestOtp with correct identifierType and identifier on valid MR submit', () => {
    authServiceSpy.requestOtp.and.returnValue(of({ success: true }));
    component.identifierType = 'mrNumber';
    component.loginForm.get('identifierValue')?.setValue('MR1234567');
    component.loginForm.get('identifierValue')?.updateValueAndValidity();

    component.onSubmit();

    expect(authServiceSpy.requestOtp).toHaveBeenCalledWith('mrNumber', 'MR1234567');
  });

  it('should call authService.requestOtp with correct identifierType and identifier on valid phone submit', () => {
    authServiceSpy.requestOtp.and.returnValue(of({ success: true }));
    component.switchType('phone');
    component.loginForm.get('identifierValue')?.setValue('9876543210');
    component.loginForm.get('identifierValue')?.updateValueAndValidity();

    component.onSubmit();

    expect(authServiceSpy.requestOtp).toHaveBeenCalledWith('phone', '9876543210');
  });

  it('should set isLoading = true while OTP request is in flight', () => {
    const subject = new Subject<unknown>();
    authServiceSpy.requestOtp.and.returnValue(subject.asObservable());

    component.loginForm.get('identifierValue')?.setValue('MR1234567');
    component.loginForm.get('identifierValue')?.updateValueAndValidity();
    component.onSubmit();

    expect(component.isLoading).toBeTrue();
    subject.next({ success: true });
    subject.complete();
  });

  it('should navigate to /otp-entry with state on successful OTP request', fakeAsync(() => {
    authServiceSpy.requestOtp.and.returnValue(of({ success: true }));
    component.loginForm.get('identifierValue')?.setValue('MR1234567');
    component.loginForm.get('identifierValue')?.updateValueAndValidity();

    component.onSubmit();
    tick();

    // VAN-37: navigation now passes state (identifier, identifierType, maskedPhone)
    expect(routerSpy.navigate).toHaveBeenCalledWith(
      ['/otp-entry'],
      { state: { identifier: 'MR1234567', identifierType: 'mrNumber', maskedPhone: null } }
    );
  }));

  it('should set isLoading = false on successful OTP request', fakeAsync(() => {
    authServiceSpy.requestOtp.and.returnValue(of({ success: true }));
    component.loginForm.get('identifierValue')?.setValue('MR1234567');
    component.loginForm.get('identifierValue')?.updateValueAndValidity();

    component.onSubmit();
    tick();

    expect(component.isLoading).toBeFalse();
  }));

  // --- Error behaviour ---

  it('should set isLoading = false and show generic apiError on HTTP error', fakeAsync(() => {
    authServiceSpy.requestOtp.and.returnValue(
      throwError(() => new Error('Server error'))
    );
    component.loginForm.get('identifierValue')?.setValue('MR1234567');
    component.loginForm.get('identifierValue')?.updateValueAndValidity();

    component.onSubmit();
    tick();
    fixture.detectChanges();

    expect(component.isLoading).toBeFalse();
    expect(component.apiError).toBe(
      'We could not process your request. Please check your details and try again.'
    );
  }));

  it('should show apiError in the DOM on HTTP error', fakeAsync(() => {
    authServiceSpy.requestOtp.and.returnValue(
      throwError(() => new Error('Server error'))
    );
    component.loginForm.get('identifierValue')?.setValue('MR1234567');
    component.loginForm.get('identifierValue')?.updateValueAndValidity();

    component.onSubmit();
    tick();
    fixture.detectChanges();

    const apiErrorEl = fixture.nativeElement.querySelector('.api-error');
    expect(apiErrorEl).toBeTruthy();
    expect(apiErrorEl.textContent).toContain(
      'We could not process your request'
    );
  }));

  it('should never show an error message that contains the identifier value (PHI hard stop)', fakeAsync(() => {
    authServiceSpy.requestOtp.and.returnValue(
      throwError(() => new Error('Server error'))
    );
    component.loginForm.get('identifierValue')?.setValue('MR1234567');
    component.loginForm.get('identifierValue')?.updateValueAndValidity();

    component.onSubmit();
    tick();
    fixture.detectChanges();

    const bodyText = fixture.nativeElement.textContent as string;
    // The MR number must not appear in any rendered text
    expect(bodyText).not.toContain('MR1234567');
  }));

  it('should never show an error message that references record existence (PHI hard stop)', fakeAsync(() => {
    authServiceSpy.requestOtp.and.returnValue(
      throwError(() => ({ error: { message: 'No account found for this MR number' } }))
    );
    component.loginForm.get('identifierValue')?.setValue('MR1234567');
    component.loginForm.get('identifierValue')?.updateValueAndValidity();

    component.onSubmit();
    tick();
    fixture.detectChanges();

    const bodyText = fixture.nativeElement.textContent as string;
    expect(bodyText).not.toContain('No account found');
    expect(bodyText).not.toContain('not registered');
    // The apiError must be the generic message
    expect(component.apiError).toBe(
      'We could not process your request. Please check your details and try again.'
    );
  }));

  // --- Submit button disabled state ---

  it('should disable the submit button while isLoading is true', () => {
    component.isLoading = true;
    fixture.detectChanges();

    const submitBtn = fixture.nativeElement.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement;
    expect(submitBtn.disabled).toBeTrue();
  });

  it('should enable the submit button when isLoading is false', () => {
    component.isLoading = false;
    fixture.detectChanges();

    const submitBtn = fixture.nativeElement.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement;
    expect(submitBtn.disabled).toBeFalse();
  });

  // --- Lockout & throttle state (VAN-40) ---

  it('sets isAccountLocked and lockoutMessage when 403 + ACCOUNT_LOCKED code returned', fakeAsync(() => {
    authServiceSpy.requestOtp.and.returnValue(
      throwError(() => ({
        status: 403,
        error: { errors: [{ code: 'ACCOUNT_LOCKED', message: 'Account is locked' }] }
      }))
    );
    component.loginForm.get('identifierValue')?.setValue('MR1234567');
    component.loginForm.get('identifierValue')?.updateValueAndValidity();

    component.onSubmit();
    tick();
    fixture.detectChanges();

    expect(component.isAccountLocked).toBeTrue();
    expect(component.lockoutMessage).toBe(LOCKOUT_MESSAGES.ACCOUNT_LOCKED);
    // PHI hard stop: generic apiError must NOT be set when lockout is handled
    expect(component.apiError).toBeNull();
  }));

  it('does NOT set isAccountLocked on generic 403 without ACCOUNT_LOCKED code', fakeAsync(() => {
    authServiceSpy.requestOtp.and.returnValue(
      throwError(() => ({ status: 403, error: {} }))
    );
    component.loginForm.get('identifierValue')?.setValue('MR1234567');
    component.loginForm.get('identifierValue')?.updateValueAndValidity();

    component.onSubmit();
    tick();

    expect(component.isAccountLocked).toBeFalse();
    expect(component.lockoutMessage).toBe('');
    // Falls through to generic error
    expect(component.apiError).toBe(
      'We could not process your request. Please check your details and try again.'
    );
  }));

  it('sets throttleMessage when 429 returned', fakeAsync(() => {
    authServiceSpy.requestOtp.and.returnValue(
      throwError(() => ({ status: 429 }))
    );
    component.loginForm.get('identifierValue')?.setValue('MR1234567');
    component.loginForm.get('identifierValue')?.updateValueAndValidity();

    component.onSubmit();
    tick();

    expect(component.throttleMessage).toBe(LOCKOUT_MESSAGES.THROTTLE(60));
    // apiError must NOT be set when throttle is handled
    expect(component.apiError).toBeNull();
    expect(component.isAccountLocked).toBeFalse();
  }));

  it('clears throttleMessage when identifier input value changes', () => {
    component.throttleMessage = 'Some throttle message';
    // Changing the field value fires valueChanges, which clears throttleMessage
    component.loginForm.get('identifierValue')?.setValue('M');
    expect(component.throttleMessage).toBe('');
  });

  it('disables submit button when isAccountLocked is true', () => {
    component.isAccountLocked = true;
    fixture.detectChanges();

    const submitBtn = fixture.nativeElement.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement;
    expect(submitBtn.disabled).toBeTrue();
  });

  it('does not set isAccountLocked on successful login', fakeAsync(() => {
    authServiceSpy.requestOtp.and.returnValue(of({ success: true }));
    component.loginForm.get('identifierValue')?.setValue('MR1234567');
    component.loginForm.get('identifierValue')?.updateValueAndValidity();

    component.onSubmit();
    tick();

    expect(component.isAccountLocked).toBeFalse();
    expect(component.lockoutMessage).toBe('');
    expect(component.throttleMessage).toBe('');
  }));

  it('clears lockout and throttle state when switching identifier type', () => {
    component.isAccountLocked = true;
    component.lockoutMessage = LOCKOUT_MESSAGES.ACCOUNT_LOCKED;
    component.throttleMessage = LOCKOUT_MESSAGES.THROTTLE(60);

    component.switchType('phone');

    expect(component.isAccountLocked).toBeFalse();
    expect(component.lockoutMessage).toBe('');
    expect(component.throttleMessage).toBe('');
  });

  // --- Cleanup ---

  it('should unsubscribe on destroy (no memory leak)', () => {
    const subject = new Subject<unknown>();
    authServiceSpy.requestOtp.and.returnValue(subject.asObservable());

    component.loginForm.get('identifierValue')?.setValue('MR1234567');
    component.loginForm.get('identifierValue')?.updateValueAndValidity();
    component.onSubmit();

    expect(component.isLoading).toBeTrue();
    component.ngOnDestroy();

    // Emitting after destroy should not update component state
    subject.next({ success: true });
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });
});
