import { Equipo } from './equipo';
import { Personal } from './personal';
import { Licencia } from './licencia';

export class Asignacion {
    id?: string; 
    _id?: string;  
    equipo: Equipo | null = null; 
    personal: Personal[] = [];  
    ubicacionFisica: string = '';
    licencias: Licencia[] = [];  
    nombreEquipo: string = '';
    contrasena: string = '';
    evidenciaAsignacion: string = '';
    fechaAsignacion: string = '';  
    fechaFinAsignacion: string = '';  
    comentarios: string = '';
}