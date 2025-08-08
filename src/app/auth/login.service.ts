import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, Observable, tap, throwError } from 'rxjs';
import { LoginRequest } from './loginRequest';
import { environment } from '../../environments/environment';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class LoginService {

  currentUserLoginOn: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  currentUserData: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  currentUserRole: BehaviorSubject<string> = new BehaviorSubject<string>('');
   mensajeExito: string = '';
  mensajeError: string = '';


  http: HttpClient = inject(HttpClient);
  private jwtHelper: JwtHelperService = inject(JwtHelperService)
private router: Router = inject(Router);

  constructor() {
    const token = sessionStorage.getItem("token");
    if (token) {
      // Verificar si el token está expirado al inicializar
      if (this.isTokenExpired(token)) {
        this.logout();
      } else {
        this.decodeAndStoreUserData(token);
        this.startTokenExpirationCheck(); // Iniciar verificación periódica
      }
    }

    
  }

  login(credentials: LoginRequest): Observable<any> {
    return this.http.post<any>(environment.urlHost + "auth/login", credentials).pipe(
      tap((userData) => {
        sessionStorage.setItem("token", userData.token);
        this.decodeAndStoreUserData(userData.token);
        this.startTokenExpirationCheck(); // Iniciar verificación periódica
      }),
      map((userData) => userData.token),
      catchError(this.handleError.bind(this))
    );
  }

  private decodeAndStoreUserData(token: string): void {
    try {
      const decodedToken = this.jwtHelper.decodeToken(token);
      this.currentUserData.next(decodedToken);
      this.currentUserLoginOn.next(true);

      const roles = decodedToken['roles'];
       if (roles) {
        this.currentUserRole.next(roles);
      } else {
        this.currentUserRole.next('');
      }

    } catch (error) {
      console.error('Error decoding token:', error);
      this.currentUserRole.next('');
      this.currentUserData.next(null);
      this.currentUserLoginOn.next(false);
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      return payload.exp < now;
    } catch (error) {
      return true;
    }
  }

  private startTokenExpirationCheck(): void {
    // Verificar cada 30 segundos si el token está expirado
    setInterval(() => {
      const token = sessionStorage.getItem("token");
      if (token && this.isTokenExpired(token)) {
        this.logout();
        this.router.navigate(['/login']);
        //console.log('Sesión expirada. Redirigiendo al login...');
        this.mostrarNotificacion ('Su sesión ha expirado. Por favor, inicie sesión nuevamente.', 'error');
      }
    }, 30000); // 30 segundose
  }

  logout(): void {
    sessionStorage.removeItem("token");
    this.currentUserLoginOn.next(false);
    this.currentUserData.next(null);
    this.currentUserRole.next('');
  }

  private handleError(error: HttpErrorResponse) {
  let mensaje = 'Algo ha fallado, intenta más tarde.';

  if (error.status === 0) {
    mensaje = 'No se pudo conectar con el servidor. Intenta más tarde.';
  } else if (error.status === 403) {
    if (error.error && typeof error.error === 'object' && error.error.message) {
      mensaje = error.error.message;
    } else {
      mensaje = 'Usuario o contraseña incorrectos.';
    }
  } else if (error.status === 401) {
    mensaje = 'Servidor fuera de servicio temporalmente.';
  }

  return throwError(() => new Error(mensaje));
}


  get userData(): Observable<any> {
    return this.currentUserData.asObservable();
  }

  get userRole$(): Observable<string> {
    return this.currentUserRole.asObservable();
  }

  get userLoginOn(): Observable<boolean> {
    return this.currentUserLoginOn.asObservable();
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
  
}