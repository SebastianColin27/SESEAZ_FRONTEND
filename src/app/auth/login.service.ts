import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, Observable, tap, throwError } from 'rxjs';
import { LoginRequest } from './loginRequest';
import { environment } from '../../environments/environment';
import { JwtHelperService } from '@auth0/angular-jwt';

@Injectable({
  providedIn: 'root'
})
export class LoginService {

  currentUserLoginOn: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  currentUserData: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  currentUserRole: BehaviorSubject<string> = new BehaviorSubject<string>('');


  http: HttpClient = inject(HttpClient);
  private jwtHelper: JwtHelperService = inject(JwtHelperService)


  constructor() {
    const token = sessionStorage.getItem("token");
        if (token) {
            this.decodeAndStoreUserData(token); // Decodifica el token al iniciar
        }
  }

  login(credentials: LoginRequest): Observable<any> {
    return this.http.post<any>(environment.urlHost + "auth/login", credentials).pipe(
      tap((userData) => {
        sessionStorage.setItem("token", userData.token);
        this.decodeAndStoreUserData(userData.token)
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

                // Obtén el rol del usuario del token decodificado
            const roles = decodedToken['roles'];
            console.log("roles", roles)
                if (roles) {
                    this.currentUserRole.next(roles);
                } else {
                    this.currentUserRole.next(''); // O un valor por defecto si no hay rol
                    console.log("no tiene  rol")
                }


        } catch (error) {
            console.error('Error decoding token:', error);          
            this.currentUserRole.next('');
            this.currentUserData.next(null);
            this.currentUserLoginOn.next(false);

        }
    }



  logout(): void {
    sessionStorage.removeItem("token");
    this.currentUserLoginOn.next(false);
        this.currentUserData.next(null);
        this.currentUserRole.next('');
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    // Log the error or handle it as needed
    console.error('An error occurred:', error.message);
    // Return an observable with a user-facing error message
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