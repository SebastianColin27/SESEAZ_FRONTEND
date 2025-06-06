import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Licencia } from '../models/licencia';



@Injectable({
  providedIn: 'root'
})
export class LicenciaService {
  private apiUrl = 'http://localhost:8080/api/licencias';
  //private apiUrl = 'https://seseaz-backend.onrender.com/api/licencias';

  constructor(private http: HttpClient) { }

  obtenerTodasLasLicencias(): Observable<Licencia[]> {
    return this.http.get<Licencia[]>(this.apiUrl);
  }

  obtenerLicenciaPorId(id: string): Observable<Licencia> {
    return this.http.get<Licencia>(`${this.apiUrl}/${id}`);
  }

  crearLicencia(licencia: Licencia): Observable<Licencia> {
    return this.http.post<Licencia>(this.apiUrl, licencia);
  }

  actualizarLicencia(id: string, licencia: Licencia): Observable<Licencia> {
    return this.http.put<Licencia>(`${this.apiUrl}/${id}`, licencia);
  }

  eliminarLicencia(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  buscarLicenciasPorNombre(nombre: string): Observable<Licencia[]> {
    return this.http.get<Licencia[]>(`${this.apiUrl}/buscar?nombre=${nombre}`);
  }
}
