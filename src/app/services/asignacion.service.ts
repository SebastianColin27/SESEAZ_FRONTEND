import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Asignacion } from '../models/asignacion';

@Injectable({
  providedIn: 'root'
})
export class AsignacionService {
  private apiUrl = 'http://localhost:8080/api/asignaciones';

  constructor(private http: HttpClient) {}

  obtenerTodasLasAsignaciones(): Observable<Asignacion[]> {
    return this.http.get<Asignacion[]>(this.apiUrl);
  }

  obtenerAsignacionPorId(id: string): Observable<Asignacion> {
    return this.http.get<Asignacion>(`${this.apiUrl}/${id}`);
  }

  crearAsignacion(asignacion: Asignacion): Observable<Asignacion> {
    return this.http.post<Asignacion>(this.apiUrl, asignacion);
  }

  actualizarAsignacion(id: string, asignacion: Asignacion): Observable<Asignacion> {
    return this.http.put<Asignacion>(`${this.apiUrl}/${id}`, asignacion);
  }

  eliminarAsignacion(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  obtenerAsignacionesPorPersona(personalId: string): Observable<Asignacion[]> {
    return this.http.get<Asignacion[]>(`${this.apiUrl}/persona/${personalId}`);
  }



  

}