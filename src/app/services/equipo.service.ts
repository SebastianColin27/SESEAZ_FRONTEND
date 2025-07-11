import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { Equipo } from '../models/equipo';
import { AuthService } from '../auth/auth.service'; // Adjust the path if needed
import { Personal } from '../models/personal';
// ...existing code...

@Injectable({
  providedIn: 'root'
})
export class EquipoService {
  // private apiUrl = 'http://localhost:8080/api/equipos';
  private apiUrl = 'https://seseaz-backend.onrender.com/api/equipos';
  //private apiUrl = 'http://192.168.100.32:8080/api/equipos';

  constructor(private http: HttpClient, private authService: AuthService) { }

  // Configuración de headers para solicitudes HTTP
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };



  private getIdString(id: any): string | null {
    if (!id) return null;
    if (typeof id === 'string') return id;
    // Handle ObjectId object from MongoDB/backend { $oid: "..." }
    if (typeof id === 'object' && id.$oid) return id.$oid;
    // Fallback, might not be safe depending on the object structure
    try {
      return id.toString();
    } catch (e) {
      console.error('Could not convert ID object to string:', id, e);
      return null;
    }
  }

  // --- Imagen---

  subirImagen(id: any, file: File): Observable<any> {
    const idString = this.getIdString(id);
    if (!idString) {
      return throwError(() => new Error('Invalid equipment ID for image upload.'));
    }

    const formData: FormData = new FormData();
    formData.append('imagen', file);

    return this.http.post(`${this.apiUrl}/${idString}/imagen`, formData).pipe(
      catchError(this.handleError)
    );
  }

  obtenerImagenUrl(id: any): string | null {
    const idString = this.getIdString(id);
    if (!idString) {
      return null;
    }
    
    return `${this.apiUrl}/${idString}/imagen`;
  }

  
  private processEquipo(equipo: Equipo): Equipo {
 
    if (equipo._id) {
      equipo.id = this.getIdString(equipo._id);
    } else if (equipo.id) {
      equipo.id = this.getIdString(equipo.id);
    }

    if (equipo.imagenGridFsId && equipo.id) {
      equipo.imagenUrl = this.obtenerImagenUrl(equipo.id) ?? undefined;
    } else {
      equipo.imagenUrl = undefined; 
    }

    if (!equipo.puertos) {
      equipo.puertos = { usb: 0, ethernet: 0, hdmi: 0, tipoC: 0, jack_35: 0, vga: 0, sd: 0 };
    } else {

      Object.keys(equipo.puertos).forEach(key => {
        if (key.endsWith('Check')) {
          delete (equipo.puertos as any)[key];
        }
      });
    }


    return equipo;
  }

  // --- Métodos CRUD ---

  obtenerTodosLosEquipos(): Observable<Equipo[]> {
    return this.http.get<Equipo[]>(this.apiUrl).pipe(
      map((data: Equipo[]) => data.map(equipo => this.processEquipo(equipo))),
      catchError(this.handleError)
    );
  }



  obtenerEquipoPorId(id: any): Observable<Equipo> {
    const idString = this.getIdString(id);
    if (!idString) {
      return throwError(() => new Error('Invalid equipment ID for fetching.'));
    }
    return this.http.get<Equipo>(`${this.apiUrl}/${idString}`).pipe(
      map(equipo => this.processEquipo(equipo)),
      catchError(this.handleError)
    );
  }

  crearEquipo(equipo: Partial<Equipo>): Observable<Equipo> {

    const equipoToSend = { ...equipo };
    delete equipoToSend.id;
    delete equipoToSend._id;
    delete equipoToSend.imagenUrl;
    delete equipoToSend.imagenGridFsId;

    if (equipoToSend.puertos) {
      Object.keys(equipoToSend.puertos).forEach(key => {
        if (key.endsWith('Check')) {
          delete (equipoToSend.puertos as any)[key];
        }
      });
    }


    return this.http.post<Equipo>(this.apiUrl, equipoToSend).pipe(
      map(nuevoEquipo => this.processEquipo(nuevoEquipo)),
      catchError(this.handleError)
    );
  }

  actualizarEquipo(id: any, equipo: Partial<Equipo>): Observable<Equipo> {
    const idString = this.getIdString(id);
    if (!idString) {
      return throwError(() => new Error('Invalid equipment ID for update.'));
    }


    const equipoToSend = { ...equipo };
    delete equipoToSend.id;
    delete equipoToSend._id;
    delete equipoToSend.imagenUrl;
    delete equipoToSend.imagenGridFsId;


    if (equipoToSend.puertos) {
      Object.keys(equipoToSend.puertos).forEach(key => {
        if (key.endsWith('Check')) {
          delete (equipoToSend.puertos as any)[key];
        }
      });
    }

    return this.http.put<Equipo>(`${this.apiUrl}/${idString}`, equipoToSend).pipe(
      map(equipoActualizado => this.processEquipo(equipoActualizado)),
      catchError(this.handleError)
    );
  }

  eliminarEquipo(id: any): Observable<void> {
    const idString = this.getIdString(id);
    if (!idString) {
      return throwError(() => new Error('Invalid equipment ID for deletion.'));
    }
    return this.http.delete<void>(`${this.apiUrl}/${idString}`).pipe(
      catchError(this.handleError)
    );
  }


  buscarEquipoPorSerie(numeroSerie: string): Observable<Equipo[] | null> {
    return this.http.get<Equipo[]>(`${this.apiUrl}/buscarSerie`, {
      params: { serieEquipo: numeroSerie }
    }).pipe(
      catchError(err => {
        if (err instanceof HttpErrorResponse && err.status === 404) {
          return of(null);
        }
        return this.handleError(err);
      })
    );
  }




  buscarEquiposPorMarca(marcaEquipo: string): Observable<Equipo[]> {
    return this.http.get<Equipo[]>(`${this.apiUrl}/buscarMarca`, {
      params: { marcaEquipo: marcaEquipo }
    }).pipe(
      map(equipos => equipos.map(equipo => this.processEquipo(equipo))),
      catchError(err => {

        if (err instanceof HttpErrorResponse && err.status === 204) {
          return of([]);
        }
        return this.handleError(err);
      })
    );
  }

  buscarEquiposPorModelo(modeloEquipo: string): Observable<Equipo[]> {
    return this.http.get<Equipo[]>(`${this.apiUrl}/buscarModelo`, {
      params: { modeloEquipo: modeloEquipo }
    }).pipe(
      map(equipos => equipos.map(equipo => this.processEquipo(equipo))),
      catchError(err => {

        if (err instanceof HttpErrorResponse && err.status === 204) {
          return of([]);
        }
        return this.handleError(err);
      })
    );
  }


  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Ocurrió un error desconocido.';
    if (error.error instanceof ErrorEvent) {

      errorMessage = `Error: ${error.error.message}`;
    } else {

      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      if (error.error && error.error.message) {
        errorMessage = `Error Code: ${error.status}\nMessage: ${error.error.message}`;
      }
    }
    console.error('API Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  
  obtenerImagenBlob(id: string): Observable<Blob> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get(`${this.apiUrl}/${id}/imagen`, {
      headers,
      responseType: 'blob'
    });
  }

}
