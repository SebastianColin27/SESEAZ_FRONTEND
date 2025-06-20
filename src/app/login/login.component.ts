import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LoginService } from '../../app/auth/login.service';
import { LoginRequest } from '../../app/auth/loginRequest';
import { LoadingComponent } from '../controlEquipos/loading/loading.component';


@Component({
  selector: 'app-login',
  standalone: true,

  imports: [ReactiveFormsModule, CommonModule, LoadingComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loading = false;
  loginError: string = "";
  isSubmitting = false; // Para evitar doble submit

  // Inyección moderna
  formBuilder: FormBuilder = inject(FormBuilder);
  router: Router = inject(Router);
  loginService: LoginService = inject(LoginService);

  loginForm = this.formBuilder.group({
    // Solo requiere que no esté vacío
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  // Getters para fácil acceso en la plantilla
  public get username() {
    return this.loginForm.controls.username;
  }

  public get password() {
    return this.loginForm.controls.password;
  }

  login() {
    this.loading = true;
    // Marca todos los campos como tocados para mostrar errores si es necesario
    this.loginForm.markAllAsTouched();

    if (this.loginForm.valid && !this.isSubmitting) {
      this.isSubmitting = true; // Previene doble click
      this.loginError = ""; // Limpia errores previos
      console.log('[LoginComponent] Formulario válido. Iniciando llamada a loginService...');

      this.loginService.login(this.loginForm.value as LoginRequest).subscribe({
        next: (tokenDevueltoPorServicio) => {
         // console.log('[LoginComponent] Callback NEXT ejecutado. Valor emitido por servicio (debería ser el token):', tokenDevueltoPorServicio);

          const tokenEnStorage = sessionStorage.getItem('token');
         // console.log('[LoginComponent] Verificando sessionStorage DENTRO de NEXT:', tokenEnStorage ? 'ENCONTRADO' : 'NO ENCONTRADO');

          if (tokenEnStorage) {
          //  console.log('[LoginComponent] Token encontrado en sessionStorage:', tokenEnStorage);
          } else {
            console.error('[LoginComponent] ¡ERROR CRÍTICO! El token no se encontró en sessionStorage inmediatamente después de que el servicio lo procesó.');
            this.loginError = "Error inesperado al iniciar sesión. Intente de nuevo.";

            this.isSubmitting = false; // Permite reintentar
          }
        },
        error: (errorData) => {
          console.error('[LoginComponent] Callback ERROR ejecutado:', errorData);
          if (errorData instanceof Error) {
            this.loginError = errorData.message;
          } else if (typeof errorData === 'string') {
            this.loginError = errorData;
          } else {
            // Mensaje más específico si es posible detectar un 401/403 vs otros errores
            this.loginError = 'Error de autenticación. Verifique su usuario y contraseña.';
          }
          this.loading = false;
          this.isSubmitting = false; // Permite reintentar
        },
        complete: () => {
          console.info("[LoginComponent] Callback COMPLETE ejecutado.");

          const tokenAntesDeNavegar = sessionStorage.getItem('token');
          console.log('[LoginComponent] Verificando sessionStorage DENTRO de COMPLETE (antes de navegar):', tokenAntesDeNavegar ? 'ENCONTRADO' : 'NO ENCONTRADO');

          if (tokenAntesDeNavegar) {
            console.log('[LoginComponent] Token confirmado. Navegando a /dashboard...');
            this.router.navigateByUrl('/dashboard'); // Ajusta la ruta si es necesario
          } else {
            console.error('[LoginComponent] El token no está presente en COMPLETE. No se navegará.');
            if (!this.loginError) {
              this.loginError = "No se pudo completar el inicio de sesión.";
            }
            this.loading = false;
            this.isSubmitting = false; // Permite reintentar
          }
        }
      });

    } else if (!this.isSubmitting) {
      console.warn('[LoginComponent] Formulario inválido o ya se está enviando.');
      if (!this.loginForm.valid) {
        // Mensaje más específico si el formulario no es válido
        if (this.username.errors?.['required'] || this.password.errors?.['required']) {
          this.loginError = "Por favor, ingrese su usuario y contraseña.";
        } else {
          this.loginError = "Por favor, complete el formulario correctamente.";
        }
      }
    }
  }
}