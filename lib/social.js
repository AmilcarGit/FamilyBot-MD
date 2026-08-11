import { normalizarJid } from './utils.js'

export const MASCOTAS_DISPONIBLES = {
  perro: { nombre: 'Perro', emoji: '🐶' },
  gato: { nombre: 'Gato', emoji: '🐱' },
  conejo: { nombre: 'Conejo', emoji: '🐰' },
  dragon: { nombre: 'Dragón', emoji: '🐉' },
  panda: { nombre: 'Panda', emoji: '🐼' },
}

const DECAIMIENTO_POR_HORA = 4

export async function obtenerPerfilSocial(db, jid) {
  const jidNormalizado = normalizarJid(jid)
  db.data.users[jidNormalizado] ??= { mensajes: 0 }
  const usuario = db.data.users[jidNormalizado]
  usuario.social ??= {}
  usuario.social.pareja ??= null
  usuario.social.fechaMatrimonio ??= null
  usuario.social.mascota ??= null
  await db.write()
  return usuario.social
}

export function actualizarDecaimientoMascota(mascota) {
  if (!mascota) return mascota

  const ahora = Date.now()
  const horasTranscurridas = (ahora - mascota.ultimaActualizacion) / (1000 * 60 * 60)
  const perdida = Math.floor(horasTranscurridas * DECAIMIENTO_POR_HORA)

  if (perdida > 0) {
    mascota.hambre = Math.max(0, mascota.hambre - perdida)
    mascota.felicidad = Math.max(0, mascota.felicidad - perdida)
    mascota.ultimaActualizacion = ahora
  }

  return mascota
}

export function formatearDuracion(ms) {
  const dias = Math.floor(ms / (1000 * 60 * 60 * 24))
  const horas = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (dias > 0) return `${dias} día(s) y ${horas} hora(s)`
  return `${horas} hora(s)`
}

export function barraProgreso(valor, longitud = 10) {
  const llenos = Math.round((valor / 100) * longitud)
  return '🟩'.repeat(llenos) + '⬜'.repeat(longitud - llenos)
}