import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * OtpPlaceholderComponent — stub route target for /otp-entry.
 * VAN-37 will replace this with the real OTP entry screen.
 */
@Component({
  selector: 'app-otp-placeholder',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="max-width:480px;margin:32px auto;padding:24px;font-family:inherit;">
      <h2>Enter One-Time Code</h2>
      <p>OTP entry screen — to be implemented in VAN-37.</p>
    </div>
  `
})
export class OtpPlaceholderComponent {}
