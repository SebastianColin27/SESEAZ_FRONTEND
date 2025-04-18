import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Equipo } from '../models/equipo';

@Injectable({
  providedIn: 'root'
})
export class EquipoService {
  //private apiUrl = 'http://localhost:8080/api/equipos'; 
  private apiUrl = 'https://seseaz-backend.onrender.com/api/equipos';

  constructor(private http: HttpClient) { }

  // Configuración de headers para solicitudes HTTP
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  obtenerTodosLosEquipos(): Observable<Equipo[]> {
    return this.http.get<Equipo[]>(this.apiUrl);
  }

  obtenerEquipoPorId(id: string): Observable<Equipo> {
    return this.http.get<Equipo>(`${this.apiUrl}/${id}`);
  }

  crearEquipo(equipo: Equipo): Observable<Equipo> {
    return this.http.post<Equipo>(this.apiUrl, equipo, this.httpOptions);
  }

  actualizarEquipo(id: string, equipo: Equipo): Observable<Equipo> {
    return this.http.put<Equipo>(`${this.apiUrl}/${id}`, equipo, this.httpOptions);
  }

  eliminarEquipo(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, this.httpOptions);
  }

 
  buscarEquipoPorSerie(numeroSerie: string): Observable<Equipo> {
    return this.http.get<Equipo>(`${this.apiUrl}/buscarSerie?serieEquipo=${numeroSerie}`);
  }
  
  
  buscarEquipoPorMarca(marcaEquipo: string): Observable<Equipo[]> {
    return this.http.get<Equipo[]>(`${this.apiUrl}/buscarMarca?marcaEquipo=${marcaEquipo}`);
  }
  
  buscarEquipoPorModelo(modeloEquipo: string): Observable<Equipo[]> {
    return this.http.get<Equipo[]>(`${this.apiUrl}/buscarModelo?modeloEquipo=${modeloEquipo}`);
  }
  
 //  método para cargar imágenes

}
