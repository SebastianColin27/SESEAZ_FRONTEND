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
      catchError(this.handleError)
    );
  }

  private decodeAndStoreUserData(token: string): void {
    try {
      const decodedToken = this.jwtHelper.decodeToken(token);
      console.log(decodedToken);

      this.currentUserData.next(decodedToken);
      this.currentUserLoginOn.next(true);

      const roles = decodedToken['roles'];
      console.log("roles", roles);
      if (roles) {
        this.currentUserRole.next(roles);
      } else {
        this.currentUserRole.next('');
        console.log("no tiene rol");
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
      console.error('Error verificando expiración del token:', error);
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
        console.log('Sesión expirada. Redirigiendo al login...');
      }
    }, 30000); // 30 segundos
  }

  logout(): void {
    sessionStorage.removeItem("token");
    this.currentUserLoginOn.next(false);
    this.currentUserData.next(null);
    this.currentUserRole.next('');
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('An error occurred:', error.message);
    return throwError(() => new Error('Something went wrong; please try again later.'));
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
}