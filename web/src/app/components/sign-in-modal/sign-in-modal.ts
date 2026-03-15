import { Component, EventEmitter, Output, inject, signal, DestroyRef } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  if (password && confirmPassword && password !== confirmPassword) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-sign-in-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './sign-in-modal.html',
  styleUrl: './sign-in-modal.css',
})
export class SignInModal {
  @Output() closed = new EventEmitter<void>();

  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  mode: 'signin' | 'signup' = 'signin';

  errorMessage = signal<string | null>(null);
  loading = signal(false);

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]],
  });

  signUpForm: FormGroup = this.fb.group(
    {
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(4)]],
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
