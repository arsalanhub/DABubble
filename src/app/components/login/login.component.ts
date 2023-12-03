import { Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DabubbleUser } from 'src/app/classes/user.class';
import { FirebaseAuthService } from 'src/app/services/firebase-auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  loginForm: FormGroup;

  user = new DabubbleUser();

  constructor(
    private authService: FirebaseAuthService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(5)]],
    });
  }

  get email() {
    return this.loginForm.get('email');
  }
  get password() {
    return this.loginForm.get('password');
  }

  async submitFomrEmailAndPassword() {
    const email = this.email.value;
    const password = this.password.value;

    if (this.loginForm.valid) {
      try {
        await this.authService.loginWithEmailAndPassword(email, password);
        // play animation
        this.router.navigate(['/home']);
      } catch (err) {
        console.log(err);
      }
    } else this.loginForm.markAllAsTouched();
  }

  async loginWithGoogle() {
    await this.authService.loginWithGoogle();
    // play animation
    this.router.navigate(['/home']);
  }

  async guestLogin() {
    await this.authService.loginWithEmailAndPassword(
      'testuser@test.com',
      'test123'
    );
    // play animation
    this.router.navigate(['/home']);
  }
}
