import { Asignacion } from './asignacion';
import { Equipo } from './equipo';
import { Personal } from './personal';
export class Mantenimiento {
    
    id?: any;
    _id?: string; 
    fecha: string = '';
    actividadRealizada: string = '';
    evidencia: string = '';

    equipo: Equipo | null = null;
    personal: Personal | null = null;
 
}