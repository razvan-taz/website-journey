import { Component, inject, signal, DestroyRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EmailConfigService } from '../../../services/email-config.service';

@Component({
  selector: 'app-admin-email-settings',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-email-settings.html',
  styleUrl: './admin-email-settings.css',
})
export class AdminEmailSettings {
  private emailConfigService = inject(EmailConfigService);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private http = inject(HttpClient);

  loading = signal(true);
  saving = signal(false);
  saveSuccess = signal(false);
  saveError = signal<string | null>(null);
  testResult = signal<'idle' | 'sending' | 'success' | 'error'>('idle');

  form = this.fb.group({
    smtpHost: ['', Validators.required],
    smtpPort: [587, [Validators.required, Validators.min(1), Validators.max(65535)]],
    username: ['', Validators.required],
    fromName: ['', Validators.required],
    fromAddress: ['', [Validators.required, Validators.email]],
    password: [''],
    sslEnabled: [false],
  });

  constructor() {
    this.emailConfigService.getConfig()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (config) => {
          this.form.patchValue({
            smtpHost: config.smtpHost,
            smtpPort: config.smtpPort,
            username: config.username,
            fromName: config.fromName,
            fromAddress: config.fromAddress,
            password: '', // always start empty
            sslEnabled: config.sslEnabled,
          });
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  sendTest(): void {
    this.testResult.set('sending');
    this.http.post('/api/admin/email-config/test', {})
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.testResult.set('success'),
        error: () => this.testResult.set('error'),
      });
  }

  save(): void {
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);
    this.saveSuccess.set(false);
    this.saveError.set(null);

    const value = this.form.value;
    this.emailConfigService.updateConfig({
      smtpHost: value.smtpHost ?? '',
      smtpPort: value.smtpPort ?? 587,
      username: value.username ?? '',
      fromName: value.fromName ?? '',
      fromAddress: value.fromAddress ?? '',
      password: value.password ?? '',
      sslEnabled: value.sslEnabled ?? false,
    }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saveSuccess.set(true);
          this.saving.set(false);
          // Clear password field after save
          this.form.patchValue({ password: '' });
        },
        error: (err) => {
          this.saveError.set(err.error?.message ?? 'Failed to save settings.');
          this.saving.set(false);
        },
      });
  }
}
