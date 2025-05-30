import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EquipoService } from '../../services/equipo.service';
import { Equipo, Puertos } from '../../models/equipo';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, FormControl, } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { LoginService } from '../../auth/login.service';
import { debounceTime, distinctUntilChanged, switchMap, catchError, forkJoin, of, Subscription, map, Observable, throwError, filter } from 'rxjs';
import { LoadingComponent } from '../loading/loading.component';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';


  @Component({
    selector: 'app-equipo-list',
    standalone: true,
    imports: [FormsModule, CommonModule, ReactiveFormsModule, LoadingComponent],
    templateUrl: './equipo-list.component.html',
    styleUrl: './equipo-list.component.css',

  })
  export class EquipoListComponent implements OnInit {
    loading = true;
    objectKeys(obj: any): string[] {
      return Object.keys(obj).filter((key) => obj[key] > 0);

    }

    equipoList: Equipo[] = [];
    selectedEquipo: Equipo | null = null;
    isModalVisible = false;
    isEditMode = false;
    searchSerie: string = '';
    searchInput: string = '';
    equipoEncontrado?: Equipo;
    imagenPreview: string | null = null;
    ordenDescendente: boolean = true;

    selectedFile: File | null = null;

    private searchSub!: Subscription;

    mensajeExito: string = '';
    mensajeError: string = '';
    isConfirmDeleteVisible: boolean = false;
    idParaEliminar: string | null = null;

     modalExportarVisible: boolean = false;

    searchControl = new FormControl('');
    private searchSubscription?: Subscription;


    constructor(private equipoService: EquipoService, private http: HttpClient,
      private loginService: LoginService, public authService: AuthService,
      private router: Router,
    ) { }


    get isAdmin(): boolean {
      return this.authService.hasRole('ROLE_ADMIN');
    }

    get isAdminOrModerador(): boolean {
      return this.authService.hasRole('ROLE_ADMIN') || this.authService.hasRole('ROLE_MODERADOR');
    }

    get isLector(): boolean {
      return this.authService.hasRole('ROLE_LECTOR');
    }

    get canViewImages(): boolean {
      return this.authService.hasRole('ROLE_ADMIN') ||
        this.authService.hasRole('ROLE_LECTOR') ||
        this.authService.hasRole('ROLE_MODERADOR');
    }



    ngOnInit(): void {
      setTimeout(() => this.loading = false, 500); // Simula carga
      this.cargarEquipos();

      this.searchSubscription = this.searchControl.valueChanges
        .pipe(
          filter((value): value is string => value !== null),
          debounceTime(300),
          distinctUntilChanged(),
          switchMap((value: string) => {
            const trimmedValue = value.trim();
            if (!trimmedValue) {
              this.cargarEquipos(); // Carga todos si la búsqueda está vacía
              return of(null);
            }

            return this.equipoService.buscarEquipoPorSerie(trimmedValue).pipe(
              catchError(err => {
                console.error('Error al buscar equipo:', err);
                this.mensajeError = 'No se encontró ningún equipo con ese número de serie.';
                return of(null);
              })
            );
          })
        )
        .subscribe((equipos) => {
          if (equipos && equipos.length > 0) {
            this.equipoList = equipos;
            this.mensajeError = '';
          } else {
            this.equipoList = [];
            this.mensajeError = 'No se encontró ningún equipo con ese número de serie.';
          }
        });


    }

    ngOnDestroy() {
      if (this.searchSubscription) {
        this.searchSubscription.unsubscribe();
      }
    }

    onFileSelected(event: any): void {
      const files = event.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        // Basic file type validation (optional)
        if (!file.type.startsWith('image/')) {
          this.mostrarNotificacion('Solo se permiten archivos de imagen.', 'error');
          this.selectedFile = null;
          this.imagenPreview = this.selectedEquipo?.imagenUrl || null; // Reset preview or show existing
          event.target.value = null; // Clear the file input
          return;
        }

        this.selectedFile = file;
        // Create a preview URL for the selected file using FileReader
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imagenPreview = e.target.result;
        };
        reader.readAsDataURL(file); // Read file as Data URL for preview
      } else {
        this.selectedFile = null;
        this.imagenPreview = this.selectedEquipo?.imagenUrl || null; // Reset preview or show existing
      }
    }
    cargarEquipos(): void {
      this.equipoService.obtenerTodosLosEquipos().subscribe(
        (data: Equipo[]) => {
          this.equipoList = data.map((item) => {
            if (item._id) {
              item.id = item._id;
            }
            return item;
          });
          console.log('Lista de equipos cargada:', this.equipoList);
        },
        (error) => {
          console.error('Error cargando equipos:', error);
        }
      );
    }

    abrirModalAgregar(): void {
      this.selectedEquipo = {
        numeroSerie: '',
        marca: '',
        modelo: '',
        tipo: '',
        procesador: '',
        ram: 0,
        hdd: 0,
        sdd: 0,
        estado: '',
        fechaCompra: '',
        imagenUrl: undefined,
        imagenGridFsId: undefined,
        puertos: {
          usb: 0, ethernet: 0, sd: 0, vga: 0, hdmi: 0, tipoC: 0, jack_35: 0
        }

      };
      this.isEditMode = false;
      this.isModalVisible = true;
      this.selectedFile = null;
      this.imagenPreview = null;
    }

    abrirModalEditar(equipo: Equipo): void {
      // Create a deep copy if ports or other nested objects can be modified
      this.selectedEquipo = JSON.parse(JSON.stringify(equipo));
      // Ensure ports are initialized if missing in data
      if (!this.selectedEquipo!.puertos) {
        this.selectedEquipo!.puertos = { usb: 0, ethernet: 0, sd: 0, vga: 0, hdmi: 0, tipoC: 0, jack_35: 0 };
      }
      this.imagenPreview = equipo.imagenUrl || null; // Show existing image preview
      this.selectedFile = null; // Clear any previously selected file

      console.log('Equipo para edición:', this.selectedEquipo);
      this.isEditMode = true;
      this.isModalVisible = true;
    }

    cerrarModal(): void {
      this.isModalVisible = false;
      this.selectedEquipo = null;
      this.selectedFile = null;
      this.imagenPreview = null;
    }



    guardarEquipo(): void {
      if (this.selectedEquipo) {
        const equipoData = { ...this.selectedEquipo }; // Copy data for sending
        const imagenFile = this.selectedFile; // Get the selected file
        this.selectedFile = null; // Clear selected file immediately

        // Remove frontend-only fields before sending to backend
        delete equipoData.imagenUrl;
        // Do NOT delete imagenGridFsId if updating, let backend handle it.
        // Wait, the backend PUT method ignores imagenGridFsId from body, it fetches existing.
        // So it's safe to delete it here too.
        delete equipoData.imagenGridFsId;


        // Clean up ports object if checkboxes were used (they are not in the current HTML though)
        if (equipoData.puertos) {
          Object.keys(equipoData.puertos).forEach(key => {
            if (key.endsWith('Check')) {
              delete (equipoData.puertos as any)[key];
            }
          });
        }


        let saveOrUpdateObservable: Observable<Equipo>;
        const equipoId = equipoData.id; // Capture ID before deleting from object

        if (this.isEditMode && equipoId) {
          // Update existing equipment
          saveOrUpdateObservable = this.equipoService.actualizarEquipo(equipoId, equipoData);
        } else {
          // Create new equipment
          saveOrUpdateObservable = this.equipoService.crearEquipo(equipoData);
        }

        saveOrUpdateObservable.pipe(
          switchMap((equipoResponse: Equipo) => {
            console.log('Equipo data saved/updated:', equipoResponse);
            // Check if an image was selected AND the equipment was saved/updated successfully (has an ID)
            if (imagenFile && equipoResponse.id) {
              // If image selected, upload it using the ID from the response
              return this.equipoService.subirImagen(equipoResponse.id, imagenFile).pipe(
                map(() => equipoResponse), // Pass the equipo response through
                catchError(uploadErr => {
                  console.error('Error al subir imagen:', uploadErr);
                  // Decide how to handle image upload failure after successful data save
                  this.mostrarNotificacion('Equipo guardado, pero falló la subida de imagen.', 'error');
                  return of(equipoResponse); // Continue the observable chain with the saved equipo data
                })
              );
            } else {
              // No image to upload, just pass the equipo response through
              return of(equipoResponse);
            }
          }),
          catchError(err => {
            console.error('Error al guardar/actualizar equipo:', err);
            this.mostrarNotificacion('Error al guardar/actualizar equipo.', 'error');
            this.cerrarModal(); // Close modal on error
            return throwError(() => err); // Re-throw the error to stop the sequence
          })
        )
          .subscribe({
            next: (finalEquipoResponse) => {
              // This block executes after both data save/update AND optional image upload
              console.log('Operación de equipo completa.');
              this.cargarEquipos(); // Reload the list including new/updated image URLs
              this.cerrarModal(); // Close the modal
              this.mostrarNotificacion(this.isEditMode ? 'Equipo actualizado con éxito' : 'Equipo agregado con éxito', 'success');
            },
            error: (err) => {
              // Error already handled and notified in catchError pipe
              console.log('Subscription finished with error.');
            }
          });
      }
    }


    cancelarEdicion(): void {
      this.cerrarModal();
    }

    // Método para abrir el modal de confirmación
    abrirModalConfirmacionEliminar(id: any): void {
      if (typeof id === 'object') {
        this.idParaEliminar = id.timestamp || JSON.stringify(id);
      } else {
        this.idParaEliminar = id.toString();
      }
      this.isConfirmDeleteVisible = true; // Muestra el modal
    }

    // Método para confirmar la eliminación
    confirmarEliminacion(): void {
      if (this.idParaEliminar) {
        this.equipoService.eliminarEquipo(this.idParaEliminar).subscribe(
          () => {
            this.cargarEquipos();
            this.mostrarNotificacion('Equipo eliminado con éxito', 'success');
            this.isConfirmDeleteVisible = false; // Oculta el modal
            this.idParaEliminar = null; // Limpia el ID
          },
          (error) => {
            console.error('Error al eliminar equipo:', error);
            this.mostrarNotificacion('Error al eliminar equipo', 'error');
            this.isConfirmDeleteVisible = false; // Oculta el modal
            this.idParaEliminar = null; // Limpia el ID
          }
        );
      }
    }

    // Método para cancelar la eliminación
    cancelarEliminacion(): void {
      this.isConfirmDeleteVisible = false; // Oculta el modal
      this.idParaEliminar = null; // Limpia el ID
    }

    // Método para eliminar personal (actualizado para usar el modal de confirmación)
    eliminarEquipo(id: any): void {
      this.abrirModalConfirmacionEliminar(id); // Abre el modal de confirmación
    }



    getPuertosList(equipo: Equipo | null | undefined): { nombre: string; cantidad: number }[] {
      if (!equipo || !equipo.puertos) return [];

      return Object.keys(equipo.puertos)
        .filter(key => {
          // Check if the key exists in Puertos interface and its value is > 0
          const puertosTyped = equipo.puertos as Puertos; // Cast for type safety
          return puertosTyped.hasOwnProperty(key) && (puertosTyped as any)[key] > 0;
        })
        .map(key => ({
          nombre: key.replace(/([A-Z])/g, ' $1').trim().toUpperCase(), // Convert camelCase to readable Name (e.g., tipoC -> TIPO C)
          cantidad: (equipo.puertos as any)[key] // Access value
        }));
    }









    isViewModalVisible = false;

    abrirModalVer(equipo: Equipo): void {
      // Create a copy for viewing
      this.selectedEquipo = { ...equipo };
      this.imagenPreview = null;
      // Ensure ports are initialized if missing
      if (!this.selectedEquipo!.puertos) {
        this.selectedEquipo!.puertos = { usb: 0, ethernet: 0, sd: 0, vga: 0, hdmi: 0, tipoC: 0, jack_35: 0 };
      }
      // imagenUrl is already populated by the service
      console.log("Equipo para ver:", this.selectedEquipo); // Debug URL
      this.isViewModalVisible = true;
    }
    cerrarModalVer(): void {
      this.isViewModalVisible = false;
      this.selectedEquipo = null;
    }


    // Método para mostrar notificaciones
    mostrarNotificacion(mensaje: string, tipo: 'success' | 'error') {
      if (tipo === 'success') {
        this.mensajeExito = mensaje;
        setTimeout(() => this.mensajeExito = '', 3000); // Oculta el mensaje después de 3 segundos
      } else if (tipo === 'error') {
        this.mensajeError = mensaje;
        setTimeout(() => this.mensajeError = '', 3000); // Oculta el mensaje después de 3 segundos
      }
    }


    // Método para redirigir al Dashboard
    irAlDashboard(): void {
      this.router.navigate(['/dashboard']); // Cambia la ruta según tu configuración de rutas
    }

    // Método para cerrar sesión
    cerrarSesion(): void {
      this.loginService.logout(); // Llama al método de logout de tu servicio
      this.router.navigate(['/login']); // Redirige al login después del logout
    }


    // Método para alternar el orden de la tabla
    alternarOrden(): void {
      this.ordenDescendente = !this.ordenDescendente;
      this.equipoList.reverse(); // invierte el orden actual del array
    }

    subirImagen(idEquipo: string, imagen: File): void {
      const formData = new FormData();
      formData.append('imagen', imagen);

      // Aquí se llama a `this.http.post` directamente, PERO esta función nunca es llamada en tu guardarEquipo().
      this.http.post(`http://localhost:8080/equipos/${idEquipo}/imagen`, formData).subscribe({ // <--- ESTE ES EL CÓDIGO QUE DEBERÍAS USAR EN EL SERVICIO
        next: () => {
          console.log('Imagen subida correctamente');
          this.mostrarNotificacion('Imagen subida correctamente', 'success');
        },
        error: err => {
          console.error('Error al subir imagen:', err);
          this.mostrarNotificacion('Error al subir imagen', 'error');
        }
      });
    }

    cargarImagen(): void {
      if (!this.selectedEquipo?.id) return;
      this.equipoService
        .obtenerImagenBlob(this.selectedEquipo.id)
        .subscribe(blob => {
          this.imagenPreview = URL.createObjectURL(blob);
        });
    }


  // Método para exportar a Excel
camposDisponibles: { campo: string; nombre: string }[] = [
  { campo: 'numeroSerie', nombre: 'Número de serie' },
  { campo: 'marca', nombre: 'Marca' },
  { campo: 'modelo', nombre: 'Modelo' },
  { campo: 'procesador', nombre: 'Procesador' },
  { campo: 'tipo', nombre: 'Tipo' },
  { campo: 'color', nombre: 'Color' },
  { campo: 'estado', nombre: 'Estado' },
  { campo: 'ram', nombre: 'RAM (GB)' },
  { campo: 'hdd', nombre: 'Disco Duro (HDD)' },
  { campo: 'sdd', nombre: 'Unidad Sólida (SDD)' },
  { campo: 'fechaCompra', nombre: 'Fecha de compra' }
];

camposSeleccionados: string[] = this.camposDisponibles.map(c => c.campo);



exportarEquiposPorEstado(estado: string): void {
  this.equipoService.obtenerTodosLosEquipos().subscribe((equipos: Equipo[]) => {
    const equiposFiltrados = equipos.filter(equipo => equipo.estado === estado);

    const data = equiposFiltrados.map(equipo => {
      const fila: any = {};
      this.camposDisponibles.forEach(campoDef => {
        if (this.camposSeleccionados.includes(campoDef.campo)) {
          let valor = (equipo as any)[campoDef.campo];
          
          // Formatear fecha si es fechaCompra
          if (campoDef.campo === 'fechaCompra' && valor) {
            valor = new Date(valor).toLocaleDateString(); // dd/mm/yyyy según navegador
          }

          fila[campoDef.nombre] = valor;
        }
      });
      return fila;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = { Sheets: { 'Equipos' : worksheet }, SheetNames: ['Equipos'] };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob: Blob = new Blob([excelBuffer], { type: 'application/octet-stream' });

    const fileName = `equipos_${estado.toLowerCase()}_${new Date().toISOString().slice(0,10)}.xlsx`;
    FileSaver.saveAs(blob, fileName);
  });
}

  
onToggleCampo(campo: string, checked: boolean): void {
  if (checked) {
    if (!this.camposSeleccionados.includes(campo)) {
      this.camposSeleccionados.push(campo);
    }
  } else {
    this.camposSeleccionados = this.camposSeleccionados.filter(c => c !== campo);
  }
}

onCheckboxChange(event: Event, campo: string): void {
  const checked = (event.target as HTMLInputElement).checked;
  this.onToggleCampo(campo, checked);
}



abrirModalExportar(): void {
  this.modalExportarVisible = true;
}

cerrarModalExportar(): void {
  this.modalExportarVisible = false;
}



  } 