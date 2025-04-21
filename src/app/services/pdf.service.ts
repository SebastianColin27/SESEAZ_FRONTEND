import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PdfService {
 // private apiUrlAsignaciones = 'http://localhost:8080/api/pdf/asignaciones';
  //private apiUrlBitacora = 'http://localhost:8080/api/pdf/mantenimientos'; 
  private apiUrlAsignaciones = 'https://seseaz-backend.onrender.com/api/pdf/asignaciones';
  private apiUrlBitacora = 'https://seseaz-backend.onrender.com/api/pdf/mantenimientos';


  constructor(private http: HttpClient) {}

  downloadAsignacionesPdf(): Observable<Blob> {
    return this.http.get(this.apiUrlAsignaciones, {
      responseType: 'blob',
      
    });
  }

  downloadBitacoraPdf(): Observable<Blob> {
    return this.http.get(this.apiUrlBitacora, {
      responseType: 'blob',
    });
  }
}
