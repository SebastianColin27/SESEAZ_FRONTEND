import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';
import { RegisterRequest } from '../models/RegisterRequest';
import { LoginService } from '../auth/login.service';
import { LoadingComponent } from '../controlEquipos/loading/loading.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoadingComponent],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  loading = true;
  form: FormGroup;
  roles = ['LECTOR', 'MODERADOR', 'ADMIN'];
  successMessage = '';
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private loginService: LoginService,
  ) {
    this.form = this.fb.group({
      username: ['', [Validators.required]],
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['', [Validators.required]]
    });
  }
  ngOnInit(): void {
    setTimeout(() => this.loading = false, 500); // Simula carga


  }
  register(): void {
    if (this.form.invalid) return;

    const request: RegisterRequest = this.form.value;
    this.authService.register(request).subscribe({
      next: (res) => {
        this.successMessage = 'Registro exitoso 🎉';
        this.errorMessage = '';
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err) => {
        this.errorMessage = 'Error al registrar. Intenta de nuevo.';
        this.successMessage = '';
        console.error(err);
      }
    });
  }

  // Método para redirigir al Dashboard
  irAlDashboard(): void {
    this.router.navigate(['/dashboard']); 
  }

  // Método para cerrar sesión
  cerrarSesion(): void {
    this.loginService.logout(); 
    this.router.navigate(['/login']);
  }
}
