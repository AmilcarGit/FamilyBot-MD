import { obtenerPerfilSocial, actualizarDecaimientoMascota, barraProgreso } from '../../lib/social.js'

export const desc = 'Muestra el estado de tu mascota'
export const cooldown = 3

export default async function mascota({ sock, msg, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const perfil = await obtenerPerfilSocial(db, jidRemitente)

  if (!perfil.mascota) {
    return sock.sendMessage(chatId, {
      text: '❌ No tienes mascota. Usa *adoptar <tipo>* para conseguir una.',
    })
  }

  actualizarDecaimientoMascota(perfil.mascota)
  await db.write()

  const m = perfil.mascota

  await sock.sendMessage(chatId, {
    text:
      `${m.emoji} *${m.nombreMascota}*\n\n` +
      `⭐ Nivel: ${m.nivel} (${m.exp}/100 exp)\n` +
      `🍖 Hambre: ${barraProgreso(m.hambre)} ${m.hambre}%\n` +
      `😊 Felicidad: ${barraProgreso(m.felicidad)} ${m.felicidad}%`,
  })
}