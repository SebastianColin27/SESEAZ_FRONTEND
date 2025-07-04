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
  isSubmitting = false; 
mensajeExito: string = '';
mensajeError: string = '';
  formBuilder: FormBuilder = inject(FormBuilder);
  router: Router = inject(Router);
  loginService: LoginService = inject(LoginService);

  loginForm = this.formBuilder.group({
  
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });


  public get username() {
    return this.loginForm.controls.username;
  }

  public get password() {
    return this.loginForm.controls.password;
  }

  // Método para mostrar notificaciones
  mostrarNotificacion(mensaje: string, tipo: 'success' | 'error') {
    if (tipo === 'success') {
      this.mensajeExito = mensaje;
      setTimeout(() => this.mensajeExito = '', 3000);
    } else if (tipo === 'error') {
      this.mensajeError = mensaje;
      setTimeout(() => this.mensajeError = '', 3000);
    }
  }

  login() {
    this.loading = true;

    this.loginForm.markAllAsTouched();

    if (this.loginForm.valid && !this.isSubmitting) {
      this.isSubmitting = true; 
      this.loginError = ""; 
      console.log('[LoginComponent] Formulario válido. Iniciando llamada a loginService...');

      this.loginService.login(this.loginForm.value as LoginRequest).subscribe({
        next: (tokenDevueltoPorServicio) => {
         
          const tokenEnStorage = sessionStorage.getItem('token');
         

          if (tokenEnStorage) {
          
          } else {
            console.error('[LoginComponent] ¡ERROR CRÍTICO! El token no se encontró en sessionStorage inmediatamente después de que el servicio lo procesó.');
            this.loginError = "Error inesperado al iniciar sesión. Intente de nuevo.";
            this.mostrarNotificacion(this.loginError, 'error');
            this.isSubmitting = false; 
          }
        },
        error: (errorData) => {
          console.error('[LoginComponent] Callback ERROR ejecutado:', errorData);
          if (errorData instanceof Error) {
            this.loginError = errorData.message;
          } else if (typeof errorData === 'string') {
            this.loginError = errorData;
          } else {
           
            this.loginError = 'Error de autenticación. Verifique su usuario y contraseña.';
            this.mostrarNotificacion(this.loginError, 'error');
          }
          this.loading = false;
          this.isSubmitting = false; 
        },
        complete: () => {
          console.info("[LoginComponent] Callback COMPLETE ejecutado.");

          const tokenAntesDeNavegar = sessionStorage.getItem('token');
          console.log('[LoginComponent] Verificando sessionStorage DENTRO de COMPLETE (antes de navegar):', tokenAntesDeNavegar ? 'ENCONTRADO' : 'NO ENCONTRADO');

          if (tokenAntesDeNavegar) {
            console.log('[LoginComponent] Token confirmado. Navegando a /dashboard...');
            this.router.navigateByUrl('/dashboard'); 
          } else {
            console.error('[LoginComponent] El token no está presente en COMPLETE. No se navegará.');
            if (!this.loginError) {
              this.loginError = "No se pudo completar el inicio de sesión.";
              this.mostrarNotificacion(this.loginError, 'error');
            }
            this.loading = false;
            this.isSubmitting = false; 
          }
        }
      });

    } else if (!this.isSubmitting) {
      console.warn('[LoginComponent] Formulario inválido o ya se está enviando.');
      if (!this.loginForm.valid) {
        
        if (this.username.errors?.['required'] || this.password.errors?.['required']) {
          this.loginError = "Por favor, ingrese su usuario y contraseña.";
          this.mostrarNotificacion(this.loginError, 'error');
        } else {
          this.loginError = "Por favor, complete el formulario correctamente.";
          this.mostrarNotificacion(this.loginError, 'error');
        }
      }
    }
  }
}