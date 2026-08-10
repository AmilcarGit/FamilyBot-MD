const VENTANA_MS = 10000
export const MAX_MENSAJES = 8

const historial = new Map()

export function registrarMensaje(jid) {
  const ahora = Date.now()
  const lista = (historial.get(jid) || []).filter((t) => ahora - t < VENTANA_MS)
  lista.push(ahora)
  historial.set(jid, lista)
  return lista.length
}

export function limpiarHistorial(jid) {
  historial.delete(jid)
}