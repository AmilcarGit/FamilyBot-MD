import { actividadConCooldown, COOLDOWN_MINAR_MS, MENSAJES_MINAR } from '../../lib/economia.js'

export const desc = 'Mina en busca de tesoros (cada 30 min)'
export const cooldown = 3

export default async function minar({ sock, msg, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const resultado = await actividadConCooldown({
    db,
    jid: jidRemitente,
    campoCooldown: 'ultimoMinar',
    cooldownMs: COOLDOWN_MINAR_MS,
    minGanancia: 50,
    maxGanancia: 200,
    mensajes: MENSAJES_MINAR,
    emoji: '⛏️',
  })

  await sock.sendMessage(chatId, { text: resultado.texto })
}