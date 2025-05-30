import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Personal } from '../models/personal';

@Injectable({
  providedIn: 'root'
})
export class PersonalService {
  //private apiUrl = 'http://localhost:8080/api/personal';
 private apiUrl = 'https://seseaz-backend.onrender.com/api/personal';


  constructor(private http: HttpClient) { }

  // Configuración de headers para solicitudes HTTP
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  obtenerTodoElPersonal(): Observable<Personal[]> {
    return this.http.get<Personal[]>(this.apiUrl);
  }

  obtenerPersonalPorId(id: string): Observable<Personal> {
    return this.http.get<Personal>(`${this.apiUrl}/${id}`);
  }

  crearPersonal(personal: Personal): Observable<Personal> {
    return this.http.post<Personal>(this.apiUrl, personal, this.httpOptions);
  }

  actualizarPersonal(id: string, personal: Personal): Observable<Personal> {
    return this.http.put<Personal>(`${this.apiUrl}/${id}`, personal);
  }

  eliminarPersonal(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, this.httpOptions);
  }

  buscarPersonalPorNombre(nombre: string): Observable<Personal[]> {
    return this.http.get<Personal[]>(`${this.apiUrl}/buscar?nombre=${nombre}`);
  }


}