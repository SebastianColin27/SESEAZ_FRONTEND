import { Component, OnInit, ChangeDetectorRef, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, NgForm, ReactiveFormsModule } from '@angular/forms';
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
import { SidebarComponent } from '../sidebar/sidebar.component';


@Component({
  selector: 'app-asignacion-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, LoadingComponent, SidebarComponent],
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
  todosLosCamposSeleccionados: boolean = true;
  private searchSubscription?: Subscription;
  fechaLimite: Date = new Date();
 
  isLicenciasModalVisible: boolean = false;
  

  paginatedList: any[] = [];
  itemsPerPage = 10;
  currentPage = 1;

  constructor(
    private cd: ChangeDetectorRef,
    private asignacionService: AsignacionService,
    private equipoService: EquipoService,
    private personalService: PersonalService,
    private licenciaService: LicenciaService,
    private loginService: LoginService, public authService: AuthService,
    private router: Router,
    private pdfService: PdfService, @Inject('FECHA_HOY') public fechaHoy: String
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
    setTimeout(() => this.loading = false, 2000);
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
            this.cargarAsignaciones();
            return of(null);
          }

          return this.asignacionService.buscarPorNumeroSerie(trimmedValue).pipe(
            catchError(err => {
              console.error('Error al buscar asignaciones:', err);
              this.mensajeError = 'Ocurrió un error al buscar asignaciones.';
              return of(null);
            })
          );
        })
      )
      .subscribe((asignaciones) => {
        if (asignaciones && asignaciones.length > 0) {
          this.asignacionList = asignaciones;
          this.currentPage = 1;
          this.updatePaginatedList();
          this.mensajeError = '';
        } else if (this.searchControl.value?.trim()) {
          this.asignacionList = [];
          this.updatePaginatedList();
          this.mensajeError = 'No se encontró ninguna asignación con esa serie.';
        }
      });

  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  cargarAsignaciones(): void {
    this.searchControl.setValue('');

    this.asignacionService.obtenerTodasLasAsignaciones().subscribe(
      (data) => {
        this.asignacionList = data
        this.currentPage = 1;
        this.updatePaginatedList();

      },
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
  const hoy = new Date();
  this.licenciaService.obtenerTodasLasLicencias().subscribe(
    (data) => {
      this.licenciaList = data.filter(lic => !lic.fechaVencimiento || new Date(lic.fechaVencimiento) > hoy);
    },
    (error) => console.error('Error al cargar licencias:', error)
  );
}

usuariosRestantes(licencia: Licencia): number {
  const hoy = new Date();

  const asignacionesActivasConLicencia = this.asignacionList.filter(asignacion =>
    asignacion.licencias?.some(l => l.id === licencia.id) &&
    (
      !asignacion.fechaFinAsignacion || new Date(asignacion.fechaFinAsignacion) > hoy
    )
  );

  return (licencia.numeroUsuarios ?? 0) - asignacionesActivasConLicencia.length;
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
    this.selectedAsignacion = JSON.parse(JSON.stringify(asignacion));
    if (this.selectedAsignacion) {
      this.selectedAsignacion.equipo = this.equipoList.find(e => e.id === asignacion.equipo?.id) || null;
    }
    if (this.selectedAsignacion) {
      this.selectedAsignacion.personal = this.personalList.find(p => p.id === asignacion.personal?.id) || null;
    }

    this.isEditMode = true;
    this.isModalVisible = true;
  }


  cerrarModal(): void {
    this.isModalVisible = false;
    this.selectedAsignacion = null;
  }

  guardarAsignacion(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      this.mostrarNotificacion('Completa todos los campos obligatorios', 'error');
      return;
    }
    this.loading = true;

    const fechaAsignacion = new Date(this.selectedAsignacion?.fechaAsignacion || '');
    const fechaFinAsignacion = new Date(this.selectedAsignacion?.fechaFinAsignacion || '');
    const hoy = new Date();
    const fechaLimite = new Date();
    fechaLimite.setFullYear(hoy.getFullYear() + 10);
    const anioAsignacion = fechaAsignacion.getFullYear();
    const anioFinAsignacion = fechaFinAsignacion.getFullYear();
    const limite = this.fechaLimite.getFullYear();


    if (anioAsignacion < 2017 || anioAsignacion > limite) {
      this.mostrarNotificacion('El año de la asignación debe ser coherente', 'error');
      this.loading = false;
      return;
    }

    if (anioFinAsignacion < 2017 || anioFinAsignacion > limite) {
      this.mostrarNotificacion('El año del final de la asignación debe ser coherente', 'error');
      this.loading = false;
      return;
    }

    if (fechaFinAsignacion < fechaAsignacion) {
      this.mostrarNotificacion('La fecha de la asignación no puede ser anterior a la fecha de retiro de la asignación', 'error');
      this.loading = false;
      return;
    }


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
            this.loading = false;
          },
          (error) => {
            console.error('Error al actualizar asignación:', error);
            this.mostrarNotificacion('Error al actualizar asignación', 'error');
            this.loading = false;
          }
        );
      } else {
        this.asignacionService.crearAsignacion(this.selectedAsignacion).subscribe(
          () => {
            this.cargarAsignaciones();
            this.cerrarModal();
            this.mostrarNotificacion('Asignación agregada con éxito', 'success');
            this.loading = false;
          },
          (error) => {
            console.error('Error al crear asignación:', error);
            this.mostrarNotificacion('Error al crear asignación', 'error');
            this.loading = false;
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
      this.asignacionService.eliminarAsignacion(this.idParaEliminar).subscribe(
        () => {
          this.cargarAsignaciones();
          this.mostrarNotificacion('Asignación eliminada con éxito', 'success');
          this.isConfirmDeleteVisible = false;
          this.idParaEliminar = null;
        },
        (error) => {
          console.error('Error al eliminar personal:', error);
          this.mostrarNotificacion('Error al eliminar personal', 'error');
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

  // Método para eliminar personal (actualizado para usar el modal de confirmación)
  eliminarAsignacion(id: any): void {
    this.abrirModalConfirmacionEliminar(id);
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

  // Método para descargar el reporte general de Asignaciones
  descargarPdf(): void {
    this.loading = true;
    this.pdfService.downloadAsignacionesPdfGeneral().subscribe(
      blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'reporte_asignaciones_general.pdf'; // Nombre del archivo
        a.click();
        window.URL.revokeObjectURL(url);
        this.mostrarNotificacion('Reporte general de asignaciones general generado con éxito.', 'success');
        this.loading = false;
      },
      error => {
        console.error('Error al descargar el reporte general de asignaciones:', error);
        this.mostrarNotificacion('Error al generar el reporte general de asignaciones.', 'error');
        this.loading = false;
      }
    );
  }

  // Método para descargar el reporte de Asignaciones por Equipo
  descargarReporteAsignacionesPorEquipo(asignacion: Asignacion): void {
    this.loading = true;
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
            window.URL.revokeObjectURL(url);
            this.mostrarNotificacion('Reporte de asignaciones por equipo generado con éxito.', 'success');
            this.loading = false;
          },
          error => {
            console.error('Error al descargar el reporte de asignaciones:', error);
            this.mostrarNotificacion('Error al generar el reporte de asignaciones.', 'error');
            this.loading = false;
          }
        );
      } else {
        console.error('ID de equipo no válido para generar reporte.');
        this.mostrarNotificacion('No se pudo generar el reporte: ID de equipo inválido.', 'error');
        this.loading = false;
      }

    } else {
      console.warn('No hay equipo asociado a esta asignación para generar reporte.');
      this.mostrarNotificacion('Esta asignación no tiene un equipo asociado para generar reporte.', 'error');
      this.loading = false;
    }
  }

  // Método para descargar el reporte de Asignaciones por Personal
  descargarReporteAsignacionesPorPersonal(asignacion: Asignacion): void {
    this.loading = true;
    if (asignacion.personal && asignacion.personal.id) {

      const personalIdString = typeof asignacion.personal.id === 'string'
        ? asignacion.personal.id
        : asignacion.personal.id.$oid;

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
            this.mostrarNotificacion('Reporte de asignaciones por personal generado con éxito.', 'success');
            this.loading = false;
          },
          error => {
            console.error('Error al descargar el reporte de asignaciones:', error);
            this.mostrarNotificacion('Error al generar el reporte de asignaciones.', 'error');
            this.loading = false;
          }
        );
      } else {
        console.error('ID de personal no válido para generar reporte.');
        this.mostrarNotificacion('No se pudo generar el reporte: ID de personal inválido.', 'error');
        this.loading = false;
      }

    } else {
      console.warn('No hay personal asociado a esta asignación para generar reporte.');
      this.mostrarNotificacion('Esta asignación no tiene un personal asociado para generar reporte.', 'error');
      this.loading = false;
    }
  }

  // Remover el item de la lista de licencias seleccionadas
  removeItem(item: any): void {
    if (this.selectedAsignacion && this.selectedAsignacion.licencias) {
      this.selectedAsignacion.licencias = this.selectedAsignacion.licencias.filter(i => i !== item);
    }
  }


  // Método para exportar a Excel
  camposDisponibles: { campo: string; nombre: string }[] = [
    { campo: 'equipo.numeroSerie', nombre: 'Número de serie' },
    { campo: 'equipo.numeroInventario', nombre: 'Número de inventario' },
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
    this.loading = true;
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

      const fileName = `equipos_${estado.toLowerCase()}_con_asignacion_${new Date().toISOString().slice(0, 10)}.xlsx`;
      FileSaver.saveAs(blob, fileName);
      this.mostrarNotificacion(`Equipos ${estado.toUpperCase()} exportados a Excel con éxito.`, 'success');
      this.loading = false;

    });
  }

  exportarTodosLosEquiposConAsignaciones(): void {
    this.loading = true;
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
      this.mostrarNotificacion('Todos los equipos exportados a Excel con éxito.', 'success');
      this.loading = false;
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

  toggleSeleccionarTodosCampos(): void {
    if (this.todosLosCamposSeleccionados) {
      this.camposSeleccionados = [];
    } else {
      this.camposSeleccionados = this.camposDisponibles.map(c => c.campo);
    }
    this.todosLosCamposSeleccionados = !this.todosLosCamposSeleccionados;
  }

  abrirModalExportar(): void {
    this.modalExportarVisible = true;
  }

  cerrarModalExportar(): void {
    this.modalExportarVisible = false;
  }



  onCheckboxChange(event: Event, campo: string): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.camposSeleccionados.includes(campo)) {
        this.camposSeleccionados.push(campo);
      }
    } else {
      this.camposSeleccionados = this.camposSeleccionados.filter(c => c !== campo);
    }

    this.todosLosCamposSeleccionados = this.camposSeleccionados.length === this.camposDisponibles.length;
  }


  ensureHttp(url: string): string {
    if (!url) return '';
    return url.startsWith('http://') || url.startsWith('https://')
      ? url
      : `https://${url}`;
  }


  updatePaginatedList() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedList = this.asignacionList.slice(start, end);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedList();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedList();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.asignacionList.length / this.itemsPerPage);
  }

  get startIndex(): number {
  return (this.currentPage - 1) * this.itemsPerPage + 1;
}

get endIndex(): number {
  const end = this.startIndex + this.paginatedList.length - 1;
  return end > this.asignacionList.length ? this.asignacionList.length : end;
}

onItemsPerPageChange() {
  this.currentPage = 1; // reiniciar a la primera página
  this.updatePaginatedList();
}



licenciasPorVencer: {
  licencia: Licencia;
  equipo: Equipo | null;
  personal: Personal | null;
}[] = [];

abrirModalLicenciasPorVencerA(): void {
  const hoy = new Date();
  const dentroDeUnMes = new Date();
  dentroDeUnMes.setMonth(hoy.getMonth() + 1);

  const licenciasQueVencen = this.licenciaList.filter(lic => {
    const fechaVenc = lic.fechaVencimiento ? new Date(lic.fechaVencimiento) : null;
    return fechaVenc && fechaVenc >= hoy && fechaVenc <= dentroDeUnMes;
  });

  const resultado: {
    licencia: Licencia;
    equipo: Equipo | null;
    personal: Personal | null;
  }[] = [];

  licenciasQueVencen.forEach(licencia => {
    this.asignacionList.forEach(asignacion => {
      if (asignacion.licencias?.some(l => l.id === licencia.id)) {
        resultado.push({
          licencia,
          equipo: asignacion.equipo ?? null,
          personal: asignacion.personal ?? null
        });
      }
    });
  });

  this.licenciasPorVencer = resultado;
  this.isLicenciasModalVisible = true;
}



}