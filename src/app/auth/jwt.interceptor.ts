import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
  HttpErrorResponse
} from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  [x: string]: any;
  constructor(private authService: AuthService) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // const token = sessionStorage.getItem('token'); // Usas sessionStorage según tu LoginService
    const token = this.authService.getToken();

 // Verificar si el token está expirado antes de hacer la petición
    if (token && this.isTokenExpired(token)) {
      this.handleTokenExpired();
      return throwError(() => new Error('Token expirado'));
    }

    if (token) {
      const cloned = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return next.handle(cloned).pipe(
        catchError((error: HttpErrorResponse) => {
          // Capturar errores 401 (no autorizado) del servidor
          if (error.status === 401) {
            this.handleTokenExpired();
          }
          return throwError(() => error);
        })
      );
    }

    return next.handle(req);
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      return payload.exp < now;
    } catch (error) {
      console.error('Error verificando expiración del token:', error);
      return true; // Si hay error, consideramos el token como expirado
    }
  }

  private handleTokenExpired(): void {
    // Limpiar datos de sesión
    sessionStorage.removeItem('token');
    
    // Aquí puedes llamar al método logout del LoginService si es necesario
    // this.loginService.logout();
    
    // Redirigir al login
    // Aquí puedes llamar al método logout del LoginService si es necesario
    // this.loginService.logout();
    // Redirigir al login
    this['router'].navigate(['/login']);
  }
}
