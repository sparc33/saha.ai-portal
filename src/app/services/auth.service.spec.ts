import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should POST to the correct API endpoint (/auth/login)', () => {
    service.requestOtp('mrNumber', 'MR1234567').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, data: null, message: 'OTP sent', errors: [] });
  });

  it('should include identifier and identifierType in the request body', () => {
    service.requestOtp('mrNumber', 'MR1234567').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.body).toEqual({
      identifier: 'MR1234567',
      identifierType: 'mrNumber'
    });
    req.flush({ success: true, data: null, message: 'OTP sent', errors: [] });
  });

  it('should send phone identifierType when called with phone type', () => {
    service.requestOtp('phone', '9876543210').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.body).toEqual({
      identifier: '9876543210',
      identifierType: 'phone'
    });
    req.flush({ success: true, data: null, message: 'OTP sent', errors: [] });
  });

  it('should return an Observable from HttpClient.post', (done) => {
    const mockResponse = {
      success: true,
      data: null,
      message: 'OTP sent',
      errors: []
    };
    service.requestOtp('mrNumber', 'MR1234567').subscribe((res) => {
      expect(res).toEqual(mockResponse);
      done();
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    req.flush(mockResponse);
  });

  it('should propagate HTTP errors to the caller without modification', (done) => {
    service.requestOtp('mrNumber', 'MR9999999').subscribe({
      next: () => fail('Expected error'),
      error: (err) => {
        expect(err).toBeTruthy();
        done();
      }
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    req.flush(
      { success: false, data: null, message: 'Error', errors: [] },
      { status: 400, statusText: 'Bad Request' }
    );
  });
});
