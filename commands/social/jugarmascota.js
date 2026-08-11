import { obtenerPerfilSocial, actualizarDecaimientoMascota } from '../../lib/social.js'

export const desc = 'Juega con tu mascota'
export const alias = ['jugarpet']
export const cooldown = 5

const COOLDOWN_MS = 20 * 60 * 1000

export default async function jugarmascota({ sock, msg, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const perfil = await obtenerPerfilSocial(db, jidRemitente)

  if (!perfil.mascota) {
    return sock.sendMessage(chatId, { text: '❌ No tienes mascota. Usa *adoptar <tipo>* primero.' })
  }

  const m = perfil.mascota
  actualizarDecaimientoMascota(m)

  m.ultimoJuego ??= 0
  const ahora = Date.now()
  const restante = m.ultimoJuego + COOLDOWN_MS - ahora

  if (restante > 0) {
    const minutos = Math.ceil(restante / 60000)
    return sock.sendMessage(chatId, { text: `⏳ ${m.nombreMascota} está cansado/a. Espera ${minutos} minuto(s).` })
  }

  m.felicidad = Math.min(100, m.felicidad + 30)
  m.exp = Math.min(100, m.exp + 5)
  m.ultimoJuego = ahora

  let textoNivel = ''
  if (m.exp >= 100) {
    m.exp = 0
    m.nivel += 1
    textoNivel = `\n🎉 ¡${m.nombreMascota} subió a nivel ${m.nivel}!`
  }

  await db.write()

  await sock.sendMessage(chatId, {
    text: `🎾 Jugaste con ${m.emoji} *${m.nombreMascota}*. Felicidad: ${m.felicidad}%${textoNivel}`,
  })
}