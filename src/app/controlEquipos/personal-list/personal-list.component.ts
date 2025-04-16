import { Component, OnInit , ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PersonalService } from '../../services/personal.service';
import { Personal } from '../../models/personal';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LoginService } from '../../auth/login.service';
import { AuthService } from '../../auth/auth.service';
import { Router } from '@angular/router';


@Component({
  selector: 'app-personal-list',
  standalone: true,
  imports: [FormsModule, CommonModule, ReactiveFormsModule],
  templateUrl: './personal-list.component.html',
  styleUrl: './personal-list.component.css',
})


export class PersonalListComponent implements OnInit {

  personalList: Personal[] = [];
  selectedPersonal: Personal | null = null;
  isModalVisible = false;
  isEditMode = false;
  searchNombre: string = ''; 

  userRole: string = '';
  ordenDescendente: boolean = true;


  mensajeExito: string = '';
mensajeError: string = '';
isConfirmDeleteVisible: boolean = false;
idParaEliminar: string | null = null;





  constructor(private personalService: PersonalService,    private cdr: ChangeDetectorRef, 
    private loginService: LoginService, public authService: AuthService,
    private router: Router,  ) { }

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
    this.cargarPersonal();

  
  }

  cargarPersonal(): void { 
    this.personalService.obtenerTodoElPersonal().subscribe( 
      (data: Personal[]) => {
       
        this.personalList = data.map(item => {
          if (item._id) {
            
            item.id = item._id;
          }
          return item;
        });
        console.log('Lista de personal cargada:', this.personalList);
      },
      (error) => {
        console.error('Error loading personal:', error);
      }
    );
  }

  abrirModalAgregar(): void { 
    
    this.selectedPersonal = { nombre: '', cargo: '', fechaIngreso: '', fechaEgreso: '' };
    this.isEditMode = false;
    this.isModalVisible = true;
  }

  abrirModalEditar(personal: Personal): void {
    this.selectedPersonal = { ...personal };
  
  
    if (this.selectedPersonal.id && typeof this.selectedPersonal.id === 'object') {
      if (personal._id) {
        this.selectedPersonal.id = personal._id;
      } else if (personal.id.$oid) {
        this.selectedPersonal.id = personal.id.$oid;
      } else {
        console.error('No se pudo determinar el ID correcto del personal', personal);
        return; 
      }
    }
  
    console.log('ID procesado para edición:', this.selectedPersonal.id);
    this.isEditMode = true;
    this.isModalVisible = true;
  }
  

  cerrarModal(): void { 
    this.isModalVisible = false;
    this.selectedPersonal = null;
  }

  guardarPersonal(): void {
    if (this.selectedPersonal) {
        if (this.isEditMode && this.selectedPersonal.id) {
            const idValido = typeof this.selectedPersonal.id === 'string' ? this.selectedPersonal.id : this.selectedPersonal.id.$oid;

            if (!idValido) {
                console.error('Error: ID inválido para actualización');
                return;
            }

            console.log('Usando ID para actualización:', idValido);
            this.personalService.actualizarPersonal(idValido, this.selectedPersonal).subscribe(
                (personalActualizado) => {
                    this.cargarPersonal();
                    this.cerrarModal();
                    this.mostrarNotificacion('Personal actualizado con éxito', 'success');
                },
                (error) => {
                    console.error('Error al actualizar personal:', error);
                    this.mostrarNotificacion('Error al actualizar personal', 'error');
                }
            );
        } else {
            const nuevoPersonal = { ...this.selectedPersonal };
            delete nuevoPersonal.id;

            this.personalService.crearPersonal(nuevoPersonal).subscribe(
                (nuevoPersonalCreado) => {
                    console.log('Personal creado:', nuevoPersonalCreado);
                    this.cargarPersonal();
                    this.cerrarModal();
                    this.mostrarNotificacion('Personal agregado con éxito', 'success');
                },
                (error) => {
                    console.error('Error al crear personal:', error);
                    this.mostrarNotificacion('Error al crear personal', 'error'); 
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
    this.personalService.eliminarPersonal(this.idParaEliminar).subscribe(
      () => {
        this.cargarPersonal();
        this.mostrarNotificacion('Personal eliminado con éxito', 'success');
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
eliminarPersonal(id: any): void {
  this.abrirModalConfirmacionEliminar(id); // Abre el modal de confirmación
}




buscarPorNombre(): void {
  const nombre = this.searchNombre.trim();
  if (nombre) {
    this.personalService.buscarPersonalPorNombre(nombre).subscribe({
      next: (data: Personal[]) => {
        this.personalList = data;
      },
      error: (err) => {
        console.error('Error al buscar personal por nombre:', err);
      }
    });
  } else {
    this.cargarPersonal();
  }
}


  isViewModalVisible = false;

abrirModalVer(personal: Personal): void {
  this.selectedPersonal = { ...personal };
  this.isViewModalVisible = true;
}

cerrarModalVer(): void {
  this.isViewModalVisible = false;
  this.selectedPersonal = null;
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

alternarOrden(): void {
  this.ordenDescendente = !this.ordenDescendente;
  this.personalList.reverse(); // invierte el orden actual del array
}


}