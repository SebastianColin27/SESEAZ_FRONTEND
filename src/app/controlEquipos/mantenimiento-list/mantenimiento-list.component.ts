import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MantenimientoService } from '../../services/mantenimiento.service';
import { AsignacionService } from '../../services/asignacion.service';
import { Mantenimiento } from '../../models/mantenimiento';
import { Asignacion } from '../../models/asignacion';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LoginService } from '../../auth/login.service';
import { AuthService } from '../../auth/auth.service';
import { Router } from '@angular/router';
import { PdfService } from '../../services/pdf.service';
import { Equipo } from '../../models/equipo';
import { EquipoService } from '../../services/equipo.service';
import { catchError, debounceTime, distinctUntilChanged, EMPTY, filter, of, Subscription, switchMap } from 'rxjs';
import { Personal } from '../../models/personal';
import { PersonalService } from '../../services/personal.service';
import { LoadingComponent } from '../loading/loading.component';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';

@Component({
  selector: 'app-mantenimiento-list',
  standalone: true,
  imports: [FormsModule, CommonModule, ReactiveFormsModule, LoadingComponent],
  templateUrl: './mantenimiento-list.component.html',
  styleUrl: './mantenimiento-list.component.css',
})
export class MantenimientoListComponent implements OnInit {

  protected Array = Array;
  loading = true;

  equiposList: Equipo[] = [];
  personalList: Personal[] = [];
  mantenimientosList: Mantenimiento[] = [];
  asignacionesList: Asignacion[] = [];
  selectedMantenimiento: Mantenimiento | null = null;
  isModalVisible = false;
  isEditMode = false;
  ordenDescendente: boolean = true;
  mensajeExito: string = '';
  mensajeError: string = '';
  isConfirmDeleteVisible: boolean = false;
  idParaEliminar: string | null = null;
  searchControl = new FormControl();
  searchSubscription!: Subscription;
  fechaInicio: Date | null = null;
fechaFin: Date | null = null;




  constructor(
    private mantenimientoService: MantenimientoService,
    private asignacionService: AsignacionService,
    private equipoService: EquipoService,
    private personalService: PersonalService,
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
    setTimeout(() => this.loading = false, 1000); // Simula carga

    this.cargarMantenimientos();

    this.cargarEquipos();

    this.cargarAsignaciones();

    this.cargarPersonal();


    this.searchSubscription = this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((value) => {
          const trimmedValue = value?.trim();
          if (!trimmedValue) {
            this.cargarMantenimientos(); 
            return EMPTY; 
          }

          return this.mantenimientoService.buscarPorNumeroSerie(trimmedValue).pipe(
            catchError(err => {
              console.error('Error al buscar asignaciones:', err);
              this.mensajeError = 'Ocurrió un error al buscar asignaciones.';
              return of([]); 
            })
          );
        })
      )
      .subscribe((mantenimientos) => {
        if (mantenimientos.length > 0) {
          this.mantenimientosList = mantenimientos;
          this.mensajeError = '';
        } else {
          this.mantenimientosList = [];
          this.mensajeError = 'No se encontró ninguna asignación con esa serie.';
        }
      });




  }



  cargarEquipos(): void {
    this.equipoService.obtenerTodosLosEquipos().subscribe(
      (data) => (this.equiposList = data),
      (error) => console.error('Error al cargar equipos:', error)
    );
  }

  cargarPersonal(): void {
    this.personalService.obtenerTodoElPersonal().subscribe(
      (data) => (this.personalList = data),
      (error) => console.error('Error al cargar personal:', error)
    );
  }


  cargarMantenimientos(): void {
    this.mantenimientoService.getMantenimientos().subscribe(
      (data: Mantenimiento[]) => {
        this.mantenimientosList = data;
        console.log('Lista de mantenimientos cargada:', this.mantenimientosList);
      },
      (error) => {
        console.error('Error cargando mantenimientos:', error);
      }
    );
  }

  abrirModalAgregar(): void {

    this.selectedMantenimiento = {
      fecha: '',
      actividadRealizada: '',
      evidencia: '',
      equipo: {} as Equipo,
      personal: {} as Personal

    };
    this.isEditMode = false;
    this.isModalVisible = true;
  }

  abrirModalEditar(mantenimiento: Mantenimiento): void {

    this.selectedMantenimiento = {
      ...mantenimiento,

      equipo: mantenimiento.equipo ? { ...mantenimiento.equipo } as Equipo : {} as Equipo
    };
    this.isEditMode = true;
    this.isModalVisible = true;
  }

  cerrarModal(): void {
    this.isModalVisible = false;
    this.selectedMantenimiento = null;
  }

  guardarMantenimiento(): void {
  if (this.selectedMantenimiento) {
    const mantenimientoParaGuardar: any = {
      ...this.selectedMantenimiento,
      equipo: this.selectedMantenimiento.equipo?.id ? { id: this.selectedMantenimiento.equipo.id } : null,
      personal: this.selectedMantenimiento.personal?.id ? { id: this.selectedMantenimiento.personal.id } : null
    };

    if (this.isEditMode && this.selectedMantenimiento.id) {
      this.mantenimientoService.updateMantenimiento(this.selectedMantenimiento.id, mantenimientoParaGuardar).subscribe(
        () => {
          this.cargarMantenimientos();
          this.cerrarModal();
          this.mostrarNotificacion('Mantenimiento actualizado con éxito', 'success');
        },
        (error) => {
          console.error('Error al actualizar mantenimiento:', error);
          this.mostrarNotificacion('Error al actualizar mantenimiento', 'error');
        }
      );
    } else {
      this.mantenimientoService.createMantenimiento(mantenimientoParaGuardar).subscribe(
        () => {
          this.cargarMantenimientos();
          this.cerrarModal();
          this.mostrarNotificacion('Mantenimiento agregado con éxito', 'success');
        },
        (error) => {
          console.error('Error al crear mantenimiento:', error);
          this.mostrarNotificacion('Error al crear mantenimiento', 'error');
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
    this.isConfirmDeleteVisible = true; 
  }

  // Método para confirmar la eliminación
  confirmarEliminacion(): void {
    if (this.idParaEliminar) {
      this.mantenimientoService.deleteMantenimiento(this.idParaEliminar).subscribe(
        () => {
          this.cargarMantenimientos();
          this.mostrarNotificacion('Mantenimiento eliminado con éxito', 'success');
          this.isConfirmDeleteVisible = false; 
          this.idParaEliminar = null; 
        },
        (error) => {
          console.error('Error al eliminar mantenimiento:', error);
          this.mostrarNotificacion('Error al eliminar mantenimiento', 'error');
          this.isConfirmDeleteVisible = false; 
          this.idParaEliminar = null; 
        }
      );
    }
  }

  // Método para cancelar la eliminación
  cancelarEliminacion(): void {
    this.isConfirmDeleteVisible = false; 
    this.idParaEliminar = null; 
  }

  // Método para eliminar (actualizado para usar el modal de confirmación)
  eliminarMantenimiento(id: any): void {
    this.abrirModalConfirmacionEliminar(id); 
  }


  getAsignacionInfo(asignacion: Asignacion | null | undefined): string {
    if (!asignacion || !asignacion.equipo) return '';

    const nombre = asignacion.nombreEquipo || 'Sin nombre';
    const modelo = asignacion.equipo.modelo || 'Sin modelo';

    return `${nombre} (${modelo})`;
  }


  isViewModalVisible = false;

  abrirModalVer(mantenimiento: Mantenimiento): void {
    this.selectedMantenimiento = { ...mantenimiento };
    this.isViewModalVisible = true;
  }

  cerrarModalVer(): void {
    this.isViewModalVisible = false;
    this.selectedMantenimiento = null;
  }

  getAsignacionText(asignacion: Asignacion[] | Asignacion | null | undefined): string {
    if (!asignacion) return 'No asignado';

    if (Array.isArray(asignacion)) {
      return asignacion.map(asig => this.getAsignacionInfo(asig)).join(', ');
    }

    return this.getAsignacionInfo(asignacion);
  }

  // Método para mostrar notificaciones
  mostrarNotificacion(mensaje: string, tipo: 'success' | 'error') {
    if (tipo === 'success') {
      this.mensajeExito = mensaje;
      setTimeout(() => this.mensajeExito = '', 3000); 
    } else if (tipo === 'error') {
      this.mensajeError = mensaje;
      setTimeout(() => this.mensajeError = '', 3000); 
    }
  }

  // Método para redirigir al Dashboard
  irAlDashboard(): void {
    this.router.navigate(['/dashboard']); 
  }

  // Método para cerrar sesión
  cerrarSesion(): void {
    this.loginService.logout(); 
    this.router.navigate(['/login']); 
  }

  // Método para alternar el orden de la tabla
  alternarOrden(): void {
    this.ordenDescendente = !this.ordenDescendente;
    this.mantenimientosList.reverse(); 
  }


  // Método para descargar el reporte general de Mantenimientos
  descargarPdfMantenimiento(): void { 
    this.pdfService.downloadMantenimientosPdfGeneral().subscribe( 
      blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'reporte_mantenimientos_general.pdf'; // Nombre de archivo más descriptivo para general
        a.click();
        window.URL.revokeObjectURL(url);

        this.mostrarNotificacion('Reporte general de mantenimientos generado con éxito.', 'success');
      },
      error => {
        console.error('Error al descargar el reporte general de mantenimientos:', error);
        this.mostrarNotificacion('Error al generar el reporte general de mantenimientos.', 'error');
      }
    );
  }


  // Método para descargar el reporte de Mantenimientos por Equipo
  descargarReporteMantenimientosPorEquipo(mantenimiento: Mantenimiento): void {
    if (mantenimiento.equipo && mantenimiento.equipo.id) {

      const equipoIdString = typeof mantenimiento.equipo.id === 'string' ? mantenimiento.equipo.id : mantenimiento.equipo.id.$oid; // Ajusta según cómo esté representado el ObjectId

      if (equipoIdString) {
        this.pdfService.downloadMantenimientosPdfPorEquipo(equipoIdString).subscribe(
          blob => {
            // Lógica para descargar el blob como archivo PDF
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `reporte_mantenimientos_equipo_${equipoIdString}.pdf`; // Nombre del archivo
            a.click();
            window.URL.revokeObjectURL(url); // Limpiar la URL del blob
            this.mostrarNotificacion('Reporte de mantenimientos generado con éxito.', 'success');
          },
          error => {
            console.error('Error al descargar el reporte de mantenimientos:', error);
            this.mostrarNotificacion('Error al generar el reporte de mantenimientos.', 'error');
          }
        );
      } else {
        console.error('ID de equipo no válido para generar reporte.');
        this.mostrarNotificacion('No se pudo generar el reporte: ID de equipo inválido.', 'error');
      }

    } else {
      console.warn('No hay equipo asociado a este mantenimiento para generar reporte.');
      this.mostrarNotificacion('Este mantenimiento no tiene un equipo asociado para generar reporte.', 'error');
    }
  }

  exportarMantenimientosAExcel(): void {
  let dataFiltrada = this.mantenimientosList;

  // Filtrado por fechas si están definidas
  if (this.fechaInicio && this.fechaFin) {
    const inicio = new Date(this.fechaInicio).getTime();
    const fin = new Date(this.fechaFin).getTime();

    dataFiltrada = dataFiltrada.filter(m => {
      const fechaMantenimiento = new Date(m.fecha).getTime();
      return fechaMantenimiento >= inicio && fechaMantenimiento <= fin;
    });
  }

  const dataParaExcel = dataFiltrada.map(m => ({
    Fecha: m.fecha,
    Actividad: m.actividadRealizada,
    Equipo: `${m.equipo?.numeroSerie || ''} / ${m.equipo?.modelo || ''} / ${m.equipo?.marca || ''} / ${m.equipo?.tipo|| ''} / ${m.equipo?.color || ''} -> ${m.equipo?.estado || ''}`,
    Responsable: this.getPersonaAsignada(m.equipo?.id, m.fecha)


  }));

  const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataParaExcel);
  const workbook: XLSX.WorkBook = { Sheets: { 'Mantenimientos': worksheet }, SheetNames: ['Mantenimientos'] };
  const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  FileSaver.saveAs(blob, 'MantenimientosFiltrados.xlsx');
}

cargarAsignaciones(): void {
  this.asignacionService.obtenerTodasLasAsignaciones().subscribe(
    (data) => {
      this.asignacionesList = data;
    },
    (error) => {
      console.error('Error al cargar asignaciones:', error);
    }
  );
}

getPersonaAsignada(equipoId: string | undefined, fechaMantenimientoStr?: string): string {
  if (!equipoId) return 'Sin asignar';

  const fechaMantenimiento = fechaMantenimientoStr ? new Date(fechaMantenimientoStr) : new Date();

  // Filtra las asignaciones del equipo
  const asignacionesDelEquipo = this.asignacionesList.filter(a =>
    a.equipo?.id === equipoId
  );

  if (asignacionesDelEquipo.length === 0) return 'Sin asignar';

  // Encuentra las asignaciones activas en la fecha del mantenimiento
  const asignacionesValidas = asignacionesDelEquipo.filter(a => {
    const inicio = new Date(a.fechaAsignacion);
    const fin = a.fechaFinAsignacion ? new Date(a.fechaFinAsignacion) : null;

    return (
      fechaMantenimiento >= inicio &&
      (!fin || fechaMantenimiento <= fin)
    );
  });

  // Si hay asignaciones válidas, tomar la más reciente (mayor fechaAsignacion)
  if (asignacionesValidas.length > 0) {
    const asignacionMasReciente = asignacionesValidas.sort((a, b) =>
      new Date(b.fechaAsignacion).getTime() - new Date(a.fechaAsignacion).getTime()
    )[0];

    return asignacionMasReciente.personal?.nombre || 'Sin asignar';
  }

  // Si no hay asignaciones activas, tomar la última sin fechaFin
  const sinFechaFin = asignacionesDelEquipo.filter(a => !a.fechaFinAsignacion);
  if (sinFechaFin.length > 0) {
    const asignacionMasReciente = sinFechaFin.sort((a, b) =>
      new Date(b.fechaAsignacion).getTime() - new Date(a.fechaAsignacion).getTime()
    )[0];

    return asignacionMasReciente.personal?.nombre || 'Sin asignar';
  }

  return 'Sin asignar';
}



}