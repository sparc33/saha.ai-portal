import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
  discardPeriodicTasks
} from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { OtpEntryComponent } from './otp-entry.component';
import { AuthService, VerifyOtpResponse } from '../services/auth.service';
import { LOCKOUT_MESSAGES } from '../shared/constants/lockout-messages.constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PHONE_STATE = {
  identifier: '9876541234',
  identifierType: 'phone' as const,
  maskedPhone: '1234'
};

const MR_STATE = {
  identifier: 'MR1234567',
  identifierType: 'mrNumber' as const,
  maskedPhone: null
};

function makeVerifyResponse(nextRoute: string, token = 'tok-abc'): VerifyOtpResponse {
  return {
    success: true,
    message: 'OK',
    data: {
      token,
      expiresIn: 3600,
      patientId: 'p1',
      patientType: nextRoute === 'new-patient-intake' ? 'new' : 'returning',
      nextRoute
    }
  };
}

function makeHttpError(status: number): HttpErrorResponse {
  return new HttpErrorResponse({ status, statusText: 'Error' });
}

/**
 * Creates an HttpErrorResponse that carries a JSON body — used by VAN-40 lockout tests
 * to simulate the structured error payload the backend sends for ACCOUNT_LOCKED.
 */
function makeHttpErrorWithBody(status: number, body: object): HttpErrorResponse {
  return new HttpErrorResponse({ status, statusText: 'Error', error: body });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OtpEntryComponent', () => {
  let fixture: ComponentFixture<OtpEntryComponent>;
  let component: OtpEntryComponent;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let navigateSpy: jasmine.Spy;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', [
      'verifyOtp',
      'requestOtp'
    ]);

    await TestBed.configureTestingModule({
      imports: [OtpEntryComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();
  });

  /**
   * Creates the component with the given navigation state.
   * Spies on Router.navigate and Router.getCurrentNavigation before
   * component construction so the constructor reads the right state.
   */
  function initComponent(state: {
    identifier: string;
    identifierType: 'mrNumber' | 'phone';
    maskedPhone: string | null;
  }): void {
    const router = TestBed.inject(Router);
    navigateSpy = spyOn(router, 'navigate');
    spyOn(router, 'getCurrentNavigation').and.returnValue({
      extras: { state }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    fixture = TestBed.createComponent(OtpEntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    sessionStorage.removeItem('auth_token');
  });

  // -------------------------------------------------------------------------
  // 1. Rendering — phone flow (maskedPhone present)
  // -------------------------------------------------------------------------

  it('should display "****<last4>" when maskedPhone is provided (phone flow)', () => {
    initComponent(PHONE_STATE);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('****1234');
  });

  it('should NOT show "****" text when maskedPhone is null (MR number flow)', () => {
    initComponent(MR_STATE);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('****');
  });

  // -------------------------------------------------------------------------
  // 2. Rendering — MR number flow (maskedPhone null)
  // -------------------------------------------------------------------------

  it('should display generic contact message when maskedPhone is null', () => {
    initComponent(MR_STATE);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Code sent to your registered contact.');
  });

  // -------------------------------------------------------------------------
  // 3. onDigitInput — strips non-digits
  // -------------------------------------------------------------------------

  it('should strip non-numeric characters from input', () => {
    initComponent(MR_STATE);
    const input = document.createElement('input');
    input.value = '12a3b4';
    component.onDigitInput({ target: input } as unknown as Event);
    expect(component.otpValue).toBe('1234');
  });

  // -------------------------------------------------------------------------
  // 4. onDigitInput — enforces maxlength of 6
  // -------------------------------------------------------------------------

  it('should enforce maxlength of 6 digits', () => {
    initComponent(MR_STATE);
    const input = document.createElement('input');
    input.value = '1234567890';
    component.onDigitInput({ target: input } as unknown as Event);
    expect(component.otpValue.length).toBeLessThanOrEqual(6);
    expect(component.otpValue).toBe('123456');
  });

  // -------------------------------------------------------------------------
  // 5. onSubmit — calls verifyOtp with correct params
  // -------------------------------------------------------------------------

  it('should call authService.verifyOtp with correct identifierType, identifier, and otp', fakeAsync(() => {
    initComponent(MR_STATE);
    authServiceSpy.verifyOtp.and.returnValue(
      of(makeVerifyResponse('new-patient-intake'))
    );
    component.otpValue = '123456';
    component.onSubmit();
    tick();
    expect(authServiceSpy.verifyOtp).toHaveBeenCalledWith(
      'mrNumber',
      'MR1234567',
      '123456'
    );
  }));

  // -------------------------------------------------------------------------
  // 6. onSubmit success — navigates to /intake/new for new-patient-intake
  // -------------------------------------------------------------------------

  it('should navigate to /intake/new when nextRoute is "new-patient-intake"', fakeAsync(() => {
    initComponent(MR_STATE);
    authServiceSpy.verifyOtp.and.returnValue(
      of(makeVerifyResponse('new-patient-intake'))
    );
    component.otpValue = '123456';
    component.onSubmit();
    tick();
    expect(navigateSpy).toHaveBeenCalledWith(['/intake/new']);
  }));

  // -------------------------------------------------------------------------
  // 7. onSubmit success — navigates to /intake/returning for returning-patient-dashboard
  // -------------------------------------------------------------------------

  it('should navigate to /intake/returning when nextRoute is "returning-patient-dashboard"', fakeAsync(() => {
    initComponent(PHONE_STATE);
    authServiceSpy.verifyOtp.and.returnValue(
      of(makeVerifyResponse('returning-patient-dashboard'))
    );
    component.otpValue = '654321';
    component.onSubmit();
    tick();
    expect(navigateSpy).toHaveBeenCalledWith(['/intake/returning']);
  }));

  // -------------------------------------------------------------------------
  // 8. onSubmit success — stores token in sessionStorage
  // -------------------------------------------------------------------------

  it('should store auth_token in sessionStorage on successful verify', fakeAsync(() => {
    initComponent(MR_STATE);
    authServiceSpy.verifyOtp.and.returnValue(
      of(makeVerifyResponse('new-patient-intake', 'my-token-xyz'))
    );
    component.otpValue = '123456';
    component.onSubmit();
    tick();
    expect(sessionStorage.getItem('auth_token')).toBe('my-token-xyz');
  }));

  // -------------------------------------------------------------------------
  // 9. onSubmit error 401 — incorrect OTP message
  // -------------------------------------------------------------------------

  it('should show "incorrect" error message on HTTP 401', fakeAsync(() => {
    initComponent(MR_STATE);
    authServiceSpy.verifyOtp.and.returnValue(
      throwError(() => makeHttpError(401))
    );
    component.otpValue = '000000';
    component.onSubmit();
    tick();
    expect(component.errorMessage).toBe(
      'The code you entered is incorrect. Please try again.'
    );
  }));

  // -------------------------------------------------------------------------
  // 10. onSubmit error 410 — expired OTP message
  // -------------------------------------------------------------------------

  it('should show "expired" error message on HTTP 410', fakeAsync(() => {
    initComponent(MR_STATE);
    authServiceSpy.verifyOtp.and.returnValue(
      throwError(() => makeHttpError(410))
    );
    component.otpValue = '000000';
    component.onSubmit();
    tick();
    expect(component.errorMessage).toBe(
      'Your code has expired. Please request a new one.'
    );
  }));

  // -------------------------------------------------------------------------
  // 11. onSubmit error 403 without ACCOUNT_LOCKED code — falls through to generic
  //     (VAN-40: the old hardcoded "max attempts" message is replaced by structured lockout state)
  // -------------------------------------------------------------------------

  it('should show generic error message on HTTP 403 without ACCOUNT_LOCKED code', fakeAsync(() => {
    initComponent(MR_STATE);
    // Plain 403 with no body — does NOT satisfy the ACCOUNT_LOCKED detection condition
    authServiceSpy.verifyOtp.and.returnValue(
      throwError(() => makeHttpError(403))
    );
    component.otpValue = '000000';
    component.onSubmit();
    tick();
    // Falls through to the else branch — generic message, NOT lockout state
    expect(component.isOtpLocked).toBeFalse();
    expect(component.errorMessage).toBe('Something went wrong. Please try again.');
  }));

  // -------------------------------------------------------------------------
  // 12. onSubmit error — generic message for any other status
  // -------------------------------------------------------------------------

  it('should show generic error message on HTTP 500', fakeAsync(() => {
    initComponent(MR_STATE);
    authServiceSpy.verifyOtp.and.returnValue(
      throwError(() => makeHttpError(500))
    );
    component.otpValue = '000000';
    component.onSubmit();
    tick();
    expect(component.errorMessage).toBe(
      'Something went wrong. Please try again.'
    );
  }));

  // -------------------------------------------------------------------------
  // 13. PHI hard stop — error message never contains server-provided text
  // -------------------------------------------------------------------------

  it('should never display server error body text (PHI hard stop)', fakeAsync(() => {
    initComponent(MR_STATE);
    const serverError = new HttpErrorResponse({
      status: 401,
      error: { message: 'Invalid OTP for patient MR1234567' }
    });
    authServiceSpy.verifyOtp.and.returnValue(throwError(() => serverError));
    component.otpValue = '000000';
    component.onSubmit();
    tick();
    fixture.detectChanges();
    const bodyText = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(bodyText).not.toContain('MR1234567');
    expect(bodyText).not.toContain('Invalid OTP for patient');
  }));

  // -------------------------------------------------------------------------
  // 14. onResend — calls authService.requestOtp (NOT a separate resend method)
  // -------------------------------------------------------------------------

  it('should call authService.requestOtp with identifierType and identifier on resend', fakeAsync(() => {
    initComponent(PHONE_STATE);
    authServiceSpy.requestOtp.and.returnValue(of({}));
    component.onResend();
    tick();
    expect(authServiceSpy.requestOtp).toHaveBeenCalledWith('phone', '9876541234');
    discardPeriodicTasks();
  }));

  // -------------------------------------------------------------------------
  // 15. onResend success — countdown starts at 30, resendDisabled = true
  // -------------------------------------------------------------------------

  it('should set countdownSeconds = 30 and resendDisabled = true on resend success', fakeAsync(() => {
    initComponent(PHONE_STATE);
    authServiceSpy.requestOtp.and.returnValue(of({}));
    component.onResend();
    tick();
    expect(component.countdownSeconds).toBe(30);
    expect(component.resendDisabled).toBeTrue();
    discardPeriodicTasks();
  }));

  // -------------------------------------------------------------------------
  // 16. countdownSeconds decrements each second (fakeAsync/tick)
  // -------------------------------------------------------------------------

  it('should decrement countdownSeconds by 1 each second', fakeAsync(() => {
    initComponent(PHONE_STATE);
    authServiceSpy.requestOtp.and.returnValue(of({}));
    component.onResend();
    tick(); // Observable resolves → countdown starts at 30
    expect(component.countdownSeconds).toBe(30);
    tick(1000);
    expect(component.countdownSeconds).toBe(29);
    tick(1000);
    expect(component.countdownSeconds).toBe(28);
    discardPeriodicTasks();
  }));

  // -------------------------------------------------------------------------
  // 17. resendDisabled returns to false after countdown reaches 0
  // -------------------------------------------------------------------------

  it('should set resendDisabled = false when countdown reaches 0', fakeAsync(() => {
    initComponent(PHONE_STATE);
    authServiceSpy.requestOtp.and.returnValue(of({}));
    component.onResend();
    tick(); // Observable resolves → countdown starts at 30
    tick(30000); // advance full 30 seconds
    expect(component.countdownSeconds).toBe(0);
    expect(component.resendDisabled).toBeFalse();
  }));

  // -------------------------------------------------------------------------
  // 18. onResend error — shows generic error message
  // -------------------------------------------------------------------------

  it('should show generic error message when resend fails', fakeAsync(() => {
    initComponent(PHONE_STATE);
    authServiceSpy.requestOtp.and.returnValue(
      throwError(() => new Error('Network error'))
    );
    component.onResend();
    tick();
    expect(component.errorMessage).toBe('Something went wrong. Please try again.');
  }));

  // -------------------------------------------------------------------------
  // 19. ngOnDestroy — clears the countdown interval (no memory leak)
  // -------------------------------------------------------------------------

  it('should clear the countdown interval on ngOnDestroy', fakeAsync(() => {
    initComponent(PHONE_STATE);
    authServiceSpy.requestOtp.and.returnValue(of({}));
    component.onResend();
    tick(1000); // countdown ticks once → 29
    expect(component.countdownSeconds).toBe(29);
    component.ngOnDestroy();
    // Advance time — countdown should NOT continue after destroy
    tick(5000);
    expect(component.countdownSeconds).toBe(29);
  }));

  // -------------------------------------------------------------------------
  // VAN-40: OTP lockout state
  // -------------------------------------------------------------------------

  it('sets isOtpLocked and otpLockoutMessage when 403 + ACCOUNT_LOCKED code returned', fakeAsync(() => {
    initComponent(MR_STATE);
    authServiceSpy.verifyOtp.and.returnValue(
      throwError(() =>
        makeHttpErrorWithBody(403, {
          errors: [{ code: 'ACCOUNT_LOCKED', message: 'Account is locked' }]
        })
      )
    );
    component.otpValue = '000000';
    component.onSubmit();
    tick();
    fixture.detectChanges();

    expect(component.isOtpLocked).toBeTrue();
    expect(component.otpLockoutMessage).toBe(LOCKOUT_MESSAGES.OTP_LOCKED);
    // PHI hard stop: errorMessage must NOT be set when lockout is handled
    expect(component.errorMessage).toBeNull();
  }));

  it('does NOT use OTP_LOCKED path for 403 without matching code', fakeAsync(() => {
    initComponent(MR_STATE);
    // Plain 403 with no ACCOUNT_LOCKED error code in the body
    authServiceSpy.verifyOtp.and.returnValue(
      throwError(() => makeHttpError(403))
    );
    component.otpValue = '000000';
    component.onSubmit();
    tick();

    expect(component.isOtpLocked).toBeFalse();
    expect(component.otpLockoutMessage).toBe('');
  }));

  it('disables OTP input when isOtpLocked is true', () => {
    initComponent(MR_STATE);
    component.isOtpLocked = true;
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('#otpInput') as HTMLInputElement;
    expect(input.disabled).toBeTrue();
  });

  it('disables submit button when isOtpLocked is true', () => {
    initComponent(MR_STATE);
    component.isOtpLocked = true;
    component.otpValue = '123456'; // otherwise length guard also disables button
    fixture.detectChanges();

    const submitBtn = fixture.nativeElement.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement;
    expect(submitBtn.disabled).toBeTrue();
  });

  it('does not set isOtpLocked on successful OTP verification', fakeAsync(() => {
    initComponent(MR_STATE);
    authServiceSpy.verifyOtp.and.returnValue(
      of(makeVerifyResponse('new-patient-intake'))
    );
    component.otpValue = '123456';
    component.onSubmit();
    tick();

    expect(component.isOtpLocked).toBeFalse();
    expect(component.otpLockoutMessage).toBe('');
  }));
});
