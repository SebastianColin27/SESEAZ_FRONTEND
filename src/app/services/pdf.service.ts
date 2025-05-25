import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PdfService {
 private apiUrlAsignaciones = 'http://localhost:8080/api/pdf/asignaciones';
  private apiUrlBitacora = 'http://localhost:8080/api/pdf/mantenimientos'; 
  private apiUrlBase = 'http://localhost:8080/api/pdf';
//  private apiUrlAsignaciones = 'https://seseaz-backend.onrender.com/api/pdf/asignaciones';
//  private apiUrlBitacora = 'https://seseaz-backend.onrender.com/api/pdf/mantenimientos';


  constructor(private http: HttpClient) {}

  downloadAsignacionesPdfGeneral(): Observable<Blob> {
    return this.http.get(`${this.apiUrlBase}/asignaciones`, { 
      responseType: 'blob',
    });
  }

  // Método para descargar el reporte general de Mantenimientos
  downloadMantenimientosPdfGeneral(): Observable<Blob> { 
    return this.http.get(`${this.apiUrlBase}/mantenimientos`, { 
      responseType: 'blob',
    });
  }

  // Método para descargar el reporte de Asignaciones por Equipo
  downloadAsignacionesPdfPorEquipo(equipoId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrlBase}/asignaciones/equipo/${equipoId}`, {
      responseType: 'blob',
    });
  }

  // Método para descargar el reporte de Mantenimientos por Equipo
  downloadMantenimientosPdfPorEquipo(equipoId: string): Observable<Blob> { 
    return this.http.get(`${this.apiUrlBase}/mantenimientos/equipo/${equipoId}`, {
      responseType: 'blob',
    });
  }

  // Método para descargar el reporte de Asignaciones por Personal
downloadAsignacionesPdfPorPersonal(personalId: string): Observable<Blob> {
  return this.http.get(`${this.apiUrlBase}/asignaciones/personal/${personalId}`, {
    responseType: 'blob',
  });
}

}
