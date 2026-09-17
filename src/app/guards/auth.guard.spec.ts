import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter, UrlTree, GuardResult, MaybeAsync } from '@angular/router';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { authGuard } from './auth.guard';
import { ReturningPatientIntakeComponent } from '../intake/returning-patient-intake.component';
import { NewPatientIntakeComponent } from '../intake/new-patient-intake.component';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runGuard(): MaybeAsync<GuardResult> {
  const routeSnap = {} as ActivatedRouteSnapshot;
  const stateSnap = {} as RouterStateSnapshot;
  return TestBed.runInInjectionContext(() => authGuard(routeSnap, stateSnap));
}

// ---------------------------------------------------------------------------
// authGuard
// ---------------------------------------------------------------------------

describe('authGuard', () => {
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', component: class {} as never },
          { path: 'intake/returning', component: ReturningPatientIntakeComponent, canActivate: [authGuard] },
          { path: 'intake/new', component: NewPatientIntakeComponent, canActivate: [authGuard] },
        ])
      ]
    });
    router = TestBed.inject(Router);
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should return true when auth_token is present in sessionStorage', () => {
    sessionStorage.setItem('auth_token', 'test-jwt-token');
    const result = runGuard();
    expect(result).toBe(true);
  });

  it('should return a UrlTree redirecting to /login when auth_token is absent', () => {
    // sessionStorage is clear from afterEach/beforeEach
    const result = runGuard();
    expect(result instanceof UrlTree).toBeTrue();
    const urlTree = result as UrlTree;
    expect(router.serializeUrl(urlTree)).toBe('/login');
  });

  it('should return a UrlTree redirecting to /login when sessionStorage is empty', () => {
    sessionStorage.clear();
    const result = runGuard();
    expect(result instanceof UrlTree).toBeTrue();
    const urlTree = result as UrlTree;
    expect(router.serializeUrl(urlTree)).toBe('/login');
  });

  it('should return true regardless of the token value (non-empty string)', () => {
    sessionStorage.setItem('auth_token', 'any-non-empty-value');
    const result = runGuard();
    expect(result).toBe(true);
  });

  it('should return a UrlTree to /login when a different key exists but not auth_token', () => {
    sessionStorage.setItem('some_other_key', 'value');
    const result = runGuard();
    expect(result instanceof UrlTree).toBeTrue();
    const urlTree = result as UrlTree;
    expect(router.serializeUrl(urlTree)).toBe('/login');
  });
});

// ---------------------------------------------------------------------------
// ReturningPatientIntakeComponent
// ---------------------------------------------------------------------------

describe('ReturningPatientIntakeComponent', () => {
  let fixture: ComponentFixture<ReturningPatientIntakeComponent>;
  let component: ReturningPatientIntakeComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReturningPatientIntakeComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ReturningPatientIntakeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render the "Welcome Back" heading', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const h1 = compiled.querySelector('h1');
    expect(h1).toBeTruthy();
    expect(h1!.textContent).toContain('Welcome Back');
  });

  it('should run ngOnInit without throwing', () => {
    // ngOnInit is a stub — just verify it completes without error
    expect(() => component.ngOnInit()).not.toThrow();
  });

  it('should render the loading message', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const p = compiled.querySelector('p');
    expect(p).toBeTruthy();
    expect(p!.textContent).toContain('Loading your health history');
  });
});

// ---------------------------------------------------------------------------
// NewPatientIntakeComponent
// ---------------------------------------------------------------------------

describe('NewPatientIntakeComponent', () => {
  let fixture: ComponentFixture<NewPatientIntakeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewPatientIntakeComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(NewPatientIntakeComponent);
    fixture.detectChanges();
  });

  it('should render the "Welcome" heading', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const h1 = compiled.querySelector('h1');
    expect(h1).toBeTruthy();
    expect(h1!.textContent).toContain('Welcome');
  });

  it('should render the intake form prompt', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const p = compiled.querySelector('p');
    expect(p).toBeTruthy();
    expect(p!.textContent).toContain("Let's get started");
  });
});
