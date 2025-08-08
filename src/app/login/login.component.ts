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

    this.loginService.login(this.loginForm.value as LoginRequest).subscribe({
      next: (tokenDevueltoPorServicio) => {
        const tokenEnStorage = sessionStorage.getItem('token');

        if (!tokenEnStorage) {
          console.error('[LoginComponent] ¡ERROR CRÍTICO! El token no se encontró en sessionStorage inmediatamente después de que el servicio lo procesó.');
          this.loginError = "Error inesperado al iniciar sesión. Intente de nuevo.";
          this.mostrarNotificacion(this.loginError, 'error');
          this.loading = false; // 
          this.isSubmitting = false;
        }
       
      },

      error: (errorData: Error) => {
        console.error(' Callback ERROR ejecutado:', errorData);
        this.loginError = errorData.message;
        this.mostrarNotificacion(this.loginError, 'error');
        this.loading = false; 
        this.isSubmitting = false;
      },

      complete: () => {
        const tokenAntesDeNavegar = sessionStorage.getItem('token');

        if (tokenAntesDeNavegar) {
          this.router.navigateByUrl('/dashboard');
        } else {
          console.error(' El token no está presente en COMPLETE. No se navegará.');
          if (!this.loginError) {
            this.loginError = "No se pudo completar el inicio de sesión.";
            this.mostrarNotificacion(this.loginError, 'error');
          }
        }

        this.loading = false; 
        this.isSubmitting = false;
      }
    });

  } else if (!this.isSubmitting) {
    this.loading = false; 
    console.warn('Formulario inválido o ya se está enviando.');

    if (!this.loginForm.valid) {
      if (this.username.errors?.['required'] || this.password.errors?.['required']) {
        console.warn('Campos requeridos no completados.');
        this.loginError = "Por favor, ingrese su usuario y contraseña.";
      } else {
        this.loginError = "Por favor, complete el formulario correctamente.";
        console.warn('Formulario incompleto o inválido.');
      }

      this.mostrarNotificacion(this.loginError, 'error');
    }
  }
}

}