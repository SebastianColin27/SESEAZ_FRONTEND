export class Equipo {
    id?: any;
    _id?: string;  
    numeroSerie?: string;
    marca?: string;
    modelo?: string;
    color?: string;
    tipo?: string;
    procesador?: string;
    ram?: number;
    hdd?: number;
    sdd?: number;
    puertos?: Puertos;
    estado?: string;
    fechaCompra?: string;

     imagenGridFsId?: string; 
    imagenUrl?: string; 
}

export class Puertos {
    [key: string]: number | undefined; 
    usb?: number;
    ethernet?: number;
    sd?: number;
    vga?: number;
    hdmi?: number;
    tipoC?: number;
    jack_35?: number;
}
