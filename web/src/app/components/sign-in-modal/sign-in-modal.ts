import { Component, EventEmitter, Output, inject, signal, DestroyRef, ElementRef, afterNextRender, HostListener } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  if (password && confirmPassword && password !== confirmPassword) {
    return { passwordMismatch: true };
  }
  return null;
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

@Component({
  selector: 'app-sign-in-modal',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './sign-in-modal.html',
  styleUrl: './sign-in-modal.css',
})
export class SignInModal {
  @Output() closed = new EventEmitter<void>();

  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private el = inject(ElementRef);

  constructor() {
    afterNextRender(() => {
      const modal = this.el.nativeElement.querySelector('.modal') as HTMLElement;
      if (modal) {
        const first = modal.querySelectorAll<HTMLElement>(FOCUSABLE)[0];
        first?.focus();
      }
    });
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const modal = this.el.nativeElement.querySelector('.modal') as HTMLElement;
    if (!modal) return;
    const focusable = Array.from(modal.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  mode: 'signin' | 'signup' = 'signin';

  errorMessage = signal<string | null>(null);
  loading = signal(false);

  showPassword = signal(false);
  showSuPassword = signal(false);
  showSuConfirmPassword = signal(false);

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]],
  });

  signUpForm: FormGroup = this.fb.group(
    {
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator }
  );

  get email() {
    return this.form.get('email')!;
  }

  get password() {
    return this.form.get('password')!;
  }

  get suName() {
    return this.signUpForm.get('name')!;
  }

  get suEmail() {
    return this.signUpForm.get('email')!;
  }

  get suPassword() {
    return this.signUpForm.get('password')!;
  }

  get suConfirmPassword() {
    return this.signUpForm.get('confirmPassword')!;
  }

  get passwordMismatch(): boolean {
    return (
      !!this.signUpForm.errors?.['passwordMismatch'] &&
      this.suConfirmPassword.touched
    );
  }

  toggleMode(): void {
    this.mode = this.mode === 'signin' ? 'signup' : 'signin';
    this.errorMessage.set(null);
    this.form.reset();
    this.signUpForm.reset();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.loading.set(true);
    const { email, password } = this.form.value;

    this.authService
      .login(email, password)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((success) => {
        this.loading.set(false);
        if (success) {
          this.closed.emit();
        } else {
          this.errorMessage.set('Invalid credentials. Please try again.');
        }
      });
  }

  onSignUp(): void {
    if (this.signUpForm.invalid) {
      this.signUpForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.loading.set(true);
    const { name, email, password } = this.signUpForm.value;

    this.authService
      .register(name, email, password)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((success) => {
        this.loading.set(false);
        if (success) {
          this.closed.emit();
        } else {
          this.errorMessage.set('Registration failed. Please check your details and try again.');
        }
      });
  }

  onClose(): void {
    this.closed.emit();
  }
}
