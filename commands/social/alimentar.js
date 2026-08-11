import { obtenerPerfilSocial, actualizarDecaimientoMascota } from '../../lib/social.js'

export const desc = 'Alimenta a tu mascota'
export const cooldown = 5

const COOLDOWN_MS = 20 * 60 * 1000

export default async function alimentar({ sock, msg, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const perfil = await obtenerPerfilSocial(db, jidRemitente)

  if (!perfil.mascota) {
    return sock.sendMessage(chatId, { text: '❌ No tienes mascota. Usa *adoptar <tipo>* primero.' })
  }

  const m = perfil.mascota
  actualizarDecaimientoMascota(m)

  m.ultimaAlimentacion ??= 0
  const ahora = Date.now()
  const restante = m.ultimaAlimentacion + COOLDOWN_MS - ahora

  if (restante > 0) {
    const minutos = Math.ceil(restante / 60000)
    return sock.sendMessage(chatId, { text: `⏳ ${m.nombreMascota} no tiene hambre todavía. Espera ${minutos} minuto(s).` })
  }

  m.hambre = Math.min(100, m.hambre + 30)
  m.exp = Math.min(100, m.exp + 5)
  m.ultimaAlimentacion = ahora

  let textoNivel = ''
  if (m.exp >= 100) {
    m.exp = 0
    m.nivel += 1
    textoNivel = `\n🎉 ¡${m.nombreMascota} subió a nivel ${m.nivel}!`
  }

  await db.write()

  await sock.sendMessage(chatId, {
    text: `🍖 Alimentaste a ${m.emoji} *${m.nombreMascota}*. Hambre: ${m.hambre}%${textoNivel}`,
  })
}