import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RegisterRequest {
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  role: 'ADMIN' | 'MODERADOR' | 'LECTOR';
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
 private apiUrl = 'http://localhost:8080/auth';

 // private apiUrl = 'https://seseaz-backend.onrender.com/auth'; 

  constructor(private jwtHelper: JwtHelperService, private http: HttpClient) { }

  getToken(): string | null {
    return sessionStorage.getItem('token');
  }

  getDecodedToken(): any {
    const token = this.getToken();
    return token ? this.jwtHelper.decodeToken(token) : null;
  }

  hasRole(role: string): boolean {
    const decoded = this.getDecodedToken();
    if (!decoded || !decoded.roles) return false;

    const roles = Array.isArray(decoded.roles) ? decoded.roles : [decoded.roles];
    return roles.includes(role);
  }

  register(request: RegisterRequest): Observable<any> {
    return this.http.post<any>(`${environment.urlHost}auth/register`, request);
  }

}
