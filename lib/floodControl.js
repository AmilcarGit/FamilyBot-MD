const VENTANA_MS = 10000
export const MAX_MENSAJES = 8

const historial = new Map()

setInterval(() => {
  const ahora = Date.now()
  for (const [jid, lista] of historial) {
    const filtrada = lista.filter((t) => ahora - t < VENTANA_MS)
    if (filtrada.length === 0) historial.delete(jid)
    else historial.set(jid, filtrada)
  }
}, 15 * 60 * 1000)

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