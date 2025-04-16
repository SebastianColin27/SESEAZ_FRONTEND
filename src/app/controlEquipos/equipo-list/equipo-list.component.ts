import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EquipoService } from '../../services/equipo.service';
import { Equipo, Puertos } from '../../models/equipo'; 
import { FormsModule, ReactiveFormsModule,  FormGroup,FormBuilder, } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { LoginService } from '../../auth/login.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-equipo-list',
  standalone: true,
  imports: [FormsModule, CommonModule, ReactiveFormsModule],
  templateUrl: './equipo-list.component.html',
  styleUrl: './equipo-list.component.css',
})
export class EquipoListComponent implements OnInit {
  objectKeys(obj: any): string[] {
    return Object.keys(obj).filter((key) => obj[key] > 0); // Filtra los puertos con cantidad > 0
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
  

  mensajeExito: string = '';
mensajeError: string = '';
isConfirmDeleteVisible: boolean = false;
idParaEliminar: string | null = null;

  constructor(private equipoService: EquipoService,  private http: HttpClient,
    private loginService: LoginService, public authService: AuthService,
    private router: Router,
  ) {}


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
    this.cargarEquipos();
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
      almacenamiento: 0,
      estado: '',
      fechaCompra: '',
      imagenUrl: '',
      puertos: {  // Inicializamos los puertos vacíos para evitar errores
        usb: 0, ethernet: 0, sd: 0, vga: 0, hdmi: 0, tipoC: 0, jack_35: 0
      }
      
    };
    this.isEditMode = false;
    this.isModalVisible = true;
  }
  
  abrirModalEditar(equipo: Equipo): void {
    this.selectedEquipo = { ...equipo };
    this.imagenPreview = equipo.imagenUrl || null;

    if (this.selectedEquipo.id && typeof this.selectedEquipo.id === 'object') {
      if (equipo._id) {
        this.selectedEquipo.id = equipo._id;
      } else if (equipo.id.$oid) {
        this.selectedEquipo.id = equipo.id.$oid;
      } else {
        console.error('No se pudo determinar el ID correcto del equipo', equipo);
        return;
      }
    }
    if (!this.selectedEquipo.puertos) {
      this.selectedEquipo.puertos = { usb: 0, ethernet: 0, sd: 0, vga: 0, hdmi: 0, tipoC: 0 };
    }

    console.log('ID procesado para edición:', this.selectedEquipo.id);
    this.isEditMode = true;
    this.isModalVisible = true;
  }

  cerrarModal(): void {
    this.isModalVisible = false;
    this.selectedEquipo = null;
  }

 

  guardarEquipo(): void {
    if (this.selectedEquipo) {
      if (this.isEditMode && this.selectedEquipo.id) {
        const idValido =
          typeof this.selectedEquipo.id === 'string'
            ? this.selectedEquipo.id
            : this.selectedEquipo.id.$oid;

        if (!idValido) {
          console.error('Error: ID inválido para actualización');
          return;
        }

        console.log('Usando ID para actualización:', idValido);
        this.equipoService.actualizarEquipo(idValido, this.selectedEquipo).subscribe(
          (equipoActualizado) => {
            this.cargarEquipos();
            this.cerrarModal();
            console.log('Equipo actualizado:', equipoActualizado);
            this.mostrarNotificacion('Equipo actualizado con éxito', 'success');
          },
          (error) => {
            console.error('Error al actualizar equipo:', error);
            this.mostrarNotificacion('Error al actualizar equipo', 'error');
          }
        );
      } else {
        const nuevoEquipo = { ...this.selectedEquipo };
        delete nuevoEquipo.id;

        this.equipoService.crearEquipo(nuevoEquipo).subscribe(
          (nuevoEquipoCreado) => {
            console.log('Equipo creado:', nuevoEquipoCreado);
            this.cargarEquipos();
            this.cerrarModal();
            this.mostrarNotificacion('Equipo agregado con éxito', 'success');
          },
          (error) => {
            console.error('Error al crear equipo:', error);
            this.mostrarNotificacion('Error al crear equipo', 'error'); 
          }
        );
      }
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

  

  getPuertosList(equipo: any): { nombre: string; cantidad: number }[] {
    if (!equipo.puertos) return [];
  
    return Object.keys(equipo.puertos)
      .filter(key => equipo.puertos[key] > 0) // Filtra los puertos con cantidad > 0
      .map(key => ({
        nombre: key.toUpperCase(), // Convierte el nombre en mayúsculas
        cantidad: equipo.puertos[key]
      }));
  }
  


  buscarEquipo(): void {
    if (!this.searchInput.trim()) {
      console.warn('Ingrese un número de serie válido.');
      return;
    }
  
    this.equipoService.buscarEquipoPorSerie(this.searchInput.trim()).subscribe({
      next: (equipo) => {
        this.equipoList = [equipo]; // reemplaza la tabla con solo ese equipo
        this.mensajeError = '';
      },
      error: (err) => {
        console.error('No se pudo encontrar el equipo:', err);
        this.equipoList = []; // limpia la tabla si hay error
        this.mensajeError = 'No se encontró el equipo con la serie ingresada.';
      }
    });
  }
  



    
  
  
  
  


 isViewModalVisible = false;
  
  abrirModalVer(equipo: Equipo): void {
    this.selectedEquipo = { ...equipo };
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
}