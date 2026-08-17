import { esPremium, formatearVencimiento } from '../../lib/premium.js'
import { normalizarJid } from '../../lib/utils.js'

export const desc = 'Muestra tu estado de premium'
export const alias = ['plan']
export const cooldown = 5

export default async function miplan({ sock, msg, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const activo = esPremium(db, jidRemitente)

  if (!activo) {
    return sock.sendMessage(chatId, {
      text:
        '⭐ No tienes premium activo todavía.\n\n' +
        'Con premium desbloqueas funciones extra del bot. Pregúntale al staff cómo obtenerlo 🌸',
    })
  }

  const datos = db.data.users[normalizarJid(jidRemitente)].premium

  await sock.sendMessage(chatId, {
    text:
      `🌟 *Tienes premium activo* 🎉\n\n` +
      `📅 Vence: ${formatearVencimiento(datos.vence)}`,
  })
}
