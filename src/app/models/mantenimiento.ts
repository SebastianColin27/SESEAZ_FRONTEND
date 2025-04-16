import { Asignacion } from './asignacion';
export class Mantenimiento {
    
    id?: any;
    _id?: string; 
    fecha: string = '';
    actividadRealizada: string = '';
    evidencia: string = '';
    asignacion: Asignacion[] = [];  
}