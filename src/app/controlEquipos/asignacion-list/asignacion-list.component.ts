import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AsignacionService } from '../../services/asignacion.service';
import { EquipoService } from '../../services/equipo.service';
import { PersonalService } from '../../services/personal.service';
import { LicenciaService } from '../../services/licencia.service';
import { Asignacion } from '../../models/asignacion';
import { Equipo } from '../../models/equipo';
import { Personal } from '../../models/personal';
import { Licencia } from '../../models/licencia';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { LoginService } from '../../auth/login.service';
import { PdfService } from '../../services/pdf.service';
import { catchError, debounceTime, distinctUntilChanged, EMPTY, filter, map, of, Subscription, switchMap } from 'rxjs';
import { LoadingComponent } from '../loading/loading.component';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';

@Component({
  selector: 'app-asignacion-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, LoadingComponent],
  templateUrl: './asignacion-list.component.html',
  styleUrl: './asignacion-list.component.css',
})
export class AsignacionComponent implements OnInit {
  loading = true;
 





  asignacionList: Asignacion[] = [];
  equipoList: Equipo[] = [];
  personalList: Personal[] = [];
  licenciaList: Licencia[] = [];
  selectedAsignacion: Asignacion | null = null;
  isModalVisible = false;
  isEditMode = false;
  searchEquipo: string = '';
  ordenDescendente: boolean = true;


  mensajeExito: string = '';
  mensajeError: string = '';
  isConfirmDeleteVisible: boolean = false;
  idParaEliminar: string | null = null;

  modalExportarVisible: boolean = false;

  searchControl = new FormControl('');
  private searchSubscription?: Subscription;

  constructor(
    private cd: ChangeDetectorRef,
    private asignacionService: AsignacionService,
    private equipoService: EquipoService,
    private personalService: PersonalService,
    private licenciaService: LicenciaService,
    private loginService: LoginService, public authService: AuthService,
    private router: Router,
    private pdfService: PdfService
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

  ngOnInit(): void {
    setTimeout(() => this.loading = false, 2000); // Simula carga
    this.cargarAsignaciones();
    this.cargarEquipos();
    this.cargarPersonal();
    this.cargarLicencias();


    this.searchSubscription = this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((value) => {
          const trimmedValue = value?.trim();
          if (!trimmedValue) {
            // Recarga todas las asignaciones y retorna un observable vacío
            this.cargarAsignaciones(); // O this.cargarEquipos() según corresponda
            return EMPTY; // No hace nada más en el flujo
          }

          return this.asignacionService.buscarPorNumeroSerie(trimmedValue).pipe(
            catchError(err => {
              console.error('Error al buscar asignaciones:', err);
              this.mensajeError = 'Ocurrió un error al buscar asignaciones.';
              return of([]); // Retorna un arreglo vacío en caso de error
            })
          );
        })
      )
      .subscribe((asignaciones) => {
        if (asignaciones.length > 0) {
          this.asignacionList = asignaciones;
          this.mensajeError = '';
        } else {
          this.asignacionList = [];
          this.mensajeError = 'No se encontró ninguna asignación con esa serie.';
        }
      });
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  cargarAsignaciones(): void {
    this.asignacionService.obtenerTodasLasAsignaciones().subscribe(
      (data) => (this.asignacionList = data),
      (error) => console.error('Error al cargar asignaciones:', error)
    );
  }

  cargarEquipos(): void {
    this.equipoService.obtenerTodosLosEquipos().subscribe(
      (data) => (this.equipoList = data),
      (error) => console.error('Error al cargar equipos:', error)
    );
  }

  cargarPersonal(): void {
    this.personalService.obtenerTodoElPersonal().subscribe(
      (data) => (this.personalList = data),
      (error) => console.error('Error al cargar personal:', error)
    );
  }

  cargarLicencias(): void {
    this.licenciaService.obtenerTodasLasLicencias().subscribe(
      (data) => (this.licenciaList = data),
      (error) => console.error('Error al cargar licencias:', error)
    );
  }

  abrirModalAgregar(): void {
    this.selectedAsignacion = {
      equipo: null,
      personal: null,
      licencias: [],
      ubicacionFisica: '',
      nombreEquipo: '',
      contrasena: '',
      evidenciaAsignacion: '',
      fechaAsignacion: '',
      fechaFinAsignacion: '',
      comentarios: ''
    };
    this.isEditMode = false;
    this.isModalVisible = true;
  }

  abrirModalEditar(asignacion: Asignacion): void {
    console.log('Asignación antes de abrir el modal:', asignacion); // Verifica qué valores tiene
    this.selectedAsignacion = JSON.parse(JSON.stringify(asignacion)); // Copia sin referencias
    this.isEditMode = true;
    this.isModalVisible = true;
  }


  cerrarModal(): void {
    this.isModalVisible = false;
    this.selectedAsignacion = null;
  }

  guardarAsignacion(): void {
    if (this.selectedAsignacion) {
      if (Array.isArray(this.selectedAsignacion.personal)) {
        this.selectedAsignacion.personal = this.selectedAsignacion.personal[0];
      }

      if (this.isEditMode && this.selectedAsignacion.id) {
        this.asignacionService.actualizarAsignacion(this.selectedAsignacion.id, this.selectedAsignacion).subscribe(
          () => {
            this.cargarAsignaciones();
            this.cerrarModal();
            this.cd.detectChanges();
            this.mostrarNotificacion('Asignación actualizada con éxito', 'success');
          },
          (error) => {
            console.error('Error al actualizar asignación:', error);
            this.mostrarNotificacion('Error al actualizar asignación', 'error');
          }
        );
      } else {
        this.asignacionService.crearAsignacion(this.selectedAsignacion).subscribe(
          () => {
            this.cargarAsignaciones();
            this.cerrarModal();
            this.mostrarNotificacion('Asignación agregada con éxito', 'success');
          },
          (error) => {
            console.error('Error al crear asignación:', error);
            this.mostrarNotificacion('Error al crear asignación', 'error');
          }
        );
      }
    }
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
      this.asignacionService.eliminarAsignacion(this.idParaEliminar).subscribe(
        () => {
          this.cargarAsignaciones();
          this.mostrarNotificacion('Asignación eliminada con éxito', 'success');
          this.isConfirmDeleteVisible = false; // Oculta el modal
          this.idParaEliminar = null; // Limpia el ID
        },
        (error) => {
          console.error('Error al eliminar personal:', error);
          this.mostrarNotificacion('Error al eliminar personal', 'error');
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
  eliminarAsignacion(id: any): void {
    this.abrirModalConfirmacionEliminar(id); // Abre el modal de confirmación
  }

  buscarPorEquipo(): void {
  }


  isViewModalVisible = false;

  abrirModalVer(asignacion: Asignacion): void {
    this.selectedAsignacion = { ...asignacion };
    this.isViewModalVisible = true;
  }

  cerrarModalVer(): void {
    this.isViewModalVisible = false;
    this.selectedAsignacion = null;
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
    this.asignacionList.reverse(); // invierte el orden actual del array
  }

  // Método para descargar el reporte general de Asignaciones
  descargarPdf(): void { // Asumiendo que este es el método para el reporte GENERAL de asignaciones
    this.pdfService.downloadAsignacionesPdfGeneral().subscribe( // Asegúrate de usar el método correcto del PdfService
      blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'reporte_asignaciones_general.pdf'; // Nombre de archivo más descriptivo para general
        a.click();
        window.URL.revokeObjectURL(url);
        // **Añade la notificación de éxito aquí:**
        this.mostrarNotificacion('Reporte general de asignaciones generado con éxito.', 'success');
      },
      error => {
        console.error('Error al descargar el reporte general de asignaciones:', error);
        // La notificación de error ya está probablemente en el catchError, si no, añádela:
        this.mostrarNotificacion('Error al generar el reporte general de asignaciones.', 'error');
      }
    );
  }

  // Método para descargar el reporte de Asignaciones por Equipo
  descargarReporteAsignacionesPorEquipo(asignacion: Asignacion): void {
    if (asignacion.equipo && asignacion.equipo.id) {

      const equipoIdString = typeof asignacion.equipo.id === 'string' ? asignacion.equipo.id : asignacion.equipo.id.$oid; // Ajusta según cómo esté representado el ObjectId en tu modelo Equipo en Angular

      if (equipoIdString) {
        this.pdfService.downloadAsignacionesPdfPorEquipo(equipoIdString).subscribe(
          blob => {
            // Lógica para descargar el blob como archivo PDF
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `reporte_asignaciones_equipo_${equipoIdString}.pdf`; // Nombre del archivo
            a.click();
            window.URL.revokeObjectURL(url); // Limpiar la URL del blob
            this.mostrarNotificacion('Reporte de asignaciones generado con éxito.', 'success');
          },
          error => {
            console.error('Error al descargar el reporte de asignaciones:', error);
            this.mostrarNotificacion('Error al generar el reporte de asignaciones.', 'error');
          }
        );
      } else {
        console.error('ID de equipo no válido para generar reporte.');
        this.mostrarNotificacion('No se pudo generar el reporte: ID de equipo inválido.', 'error');
      }

    } else {
      console.warn('No hay equipo asociado a esta asignación para generar reporte.');
      this.mostrarNotificacion('Esta asignación no tiene un equipo asociado para generar reporte.', 'error');
    }
  }

  // Método para descargar el reporte de Asignaciones por Personal
  descargarReporteAsignacionesPorPersonal(asignacion: Asignacion): void {
    if (asignacion.personal && asignacion.personal.id) {

      const personalIdString = typeof asignacion.personal.id === 'string'
        ? asignacion.personal.id
        : asignacion.personal.id.$oid; // Ajusta según cómo esté representado el ObjectId en tu modelo Personal en Angular

      if (personalIdString) {
        this.pdfService.downloadAsignacionesPdfPorPersonal(personalIdString).subscribe(
          blob => {
            // Lógica para descargar el blob como archivo PDF
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `reporte_asignaciones_personal_${personalIdString}.pdf`; // Nombre del archivo
            a.click();
            window.URL.revokeObjectURL(url); // Limpiar la URL del blob
            this.mostrarNotificacion('Reporte de asignaciones generado con éxito.', 'success');
          },
          error => {
            console.error('Error al descargar el reporte de asignaciones:', error);
            this.mostrarNotificacion('Error al generar el reporte de asignaciones.', 'error');
          }
        );
      } else {
        console.error('ID de personal no válido para generar reporte.');
        this.mostrarNotificacion('No se pudo generar el reporte: ID de personal inválido.', 'error');
      }

    } else {
      console.warn('No hay personal asociado a esta asignación para generar reporte.');
      this.mostrarNotificacion('Esta asignación no tiene un personal asociado para generar reporte.', 'error');
    }
  }

  // Remover el item de la lista de licencias seleccionadas
  removeItem(item: any) {
    const index = this.selectedAsignacion?.licencias.indexOf(item);
    if (index !== undefined && index > -1) {
      this.selectedAsignacion?.licencias.splice(index, 1);
    }
    this.cd.detectChanges(); // Asegúrate de que Angular detecte el cambio
  }


  // Método para exportar a Excel
camposDisponibles: { campo: string; nombre: string }[] = [
  { campo: 'equipo.numeroSerie', nombre: 'Número de serie' },
  { campo: 'equipo.marca', nombre: 'Marca' },
  { campo: 'equipo.modelo', nombre: 'Modelo' },
  { campo: 'equipo.tipo', nombre: 'Tipo' },
  { campo: 'equipo.estado', nombre: 'Estado' },
  { campo: 'equipo.ram', nombre: 'RAM (GB)' },
  { campo: 'equipo.hdd', nombre: 'Disco Duro (HDD)' },
  { campo: 'equipo.sdd', nombre: 'Unidad Sólida (SDD)' },
  { campo: 'equipo.fechaCompra', nombre: 'Fecha de compra' },
  { campo: 'personal.nombre', nombre: 'Nombre del personal' },
  { campo: 'asignacion.fechaAsignacion', nombre: 'Fecha de asignación' },
  { campo: 'asignacion.fechaFinAsignacion', nombre: 'Fin de asignación' },
  { campo: 'asignacion.ubicacionFisica', nombre: 'Ubicación física' },
  { campo: 'asignacion.nombreEquipo', nombre: 'Nombre de equipo' },
  { campo: 'asignacion.contrasena', nombre: 'Contraseña' },
  { campo: 'asignacion.evidenciaAsignacion', nombre: 'Evidencia' },
  { campo: 'asignacion.comentarios', nombre: 'Comentarios' }
];

camposSeleccionados: string[] = this.camposDisponibles.map(c => c.campo);


exportarEquiposConAsignacionesDesdeRelaciones(estado: string): void {
  this.asignacionService.obtenerTodasLasAsignaciones().subscribe((asignaciones: Asignacion[]) => {
    const asignacionesFiltradas = asignaciones.filter(asignacion =>
      asignacion.equipo?.estado === estado && asignacion.personal && asignacion.equipo
    );

    // Mapear datos con encabezados legibles
    const data = asignacionesFiltradas.map(asignacion => {
      const fila: any = {};
      this.camposDisponibles.forEach(campoDef => {
        if (this.camposSeleccionados.includes(campoDef.campo)) {
          const [entidad, propiedad] = campoDef.campo.split('.');
          let valor = '';
          if (entidad === 'personal') {
            valor = (asignacion.personal as any)[propiedad];
          } else if (entidad === 'equipo') {
            valor = (asignacion.equipo as any)[propiedad];
          } else if (entidad === 'asignacion') {
            valor = (asignacion as any)[propiedad];
          }
          fila[campoDef.nombre] = valor;
        }
      });
      return fila;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = { Sheets: { 'EquiposAsignados': worksheet }, SheetNames: ['EquiposAsignados'] };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob: Blob = new Blob([excelBuffer], { type: 'application/octet-stream' });

    const fileName = `equipos_${estado.toLowerCase()}_con_asignacion_${new Date().toISOString().slice(0,10)}.xlsx`;
    FileSaver.saveAs(blob, fileName);
  });
}

exportarTodosLosEquiposConAsignaciones(): void {
  this.asignacionService.obtenerTodasLasAsignaciones().subscribe((asignaciones: Asignacion[]) => {
    const asignacionesFiltradas = asignaciones.filter(asignacion =>
      asignacion.personal && asignacion.equipo
    );

    const data = asignacionesFiltradas.map(asignacion => {
      const fila: any = {};
      this.camposDisponibles.forEach(campoDef => {
        if (this.camposSeleccionados.includes(campoDef.campo)) {
          const [entidad, propiedad] = campoDef.campo.split('.');
          let valor = '';
          if (entidad === 'personal') {
            valor = (asignacion.personal as any)[propiedad];
          } else if (entidad === 'equipo') {
            valor = (asignacion.equipo as any)[propiedad];
          } else if (entidad === 'asignacion') {
            valor = (asignacion as any)[propiedad];
          }
          fila[campoDef.nombre] = valor;
        }
      });
      return fila;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = { Sheets: { 'EquiposAsignados': worksheet }, SheetNames: ['EquiposAsignados'] };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob: Blob = new Blob([excelBuffer], { type: 'application/octet-stream' });

    const fileName = `equipos_todos_con_asignacion_${new Date().toISOString().slice(0, 10)}.xlsx`;
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


abrirModalExportar(): void {
  this.modalExportarVisible = true;
}

cerrarModalExportar(): void {
  this.modalExportarVisible = false;
}

onCheckboxChange(event: Event, campo: string): void {
  const checked = (event.target as HTMLInputElement).checked;
  this.onToggleCampo(campo, checked);
}

}