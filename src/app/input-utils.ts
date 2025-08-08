export function evitarEntradaInvalidaNumeros(event: KeyboardEvent): void {
  const teclasPermitidas = ['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete', 'ArrowUp', 'ArrowDown', 'Enter', 'Escape'];
  if (teclasPermitidas.includes(event.key)) return;

  const esNumero = /^[0-9]$/.test(event.key);
  if (!esNumero) {
    event.preventDefault();
  }
}

export function evitarNegativos(event: KeyboardEvent): void {
  if (event.key === '-' || event.key === 'e') {
    event.preventDefault();
  }
}