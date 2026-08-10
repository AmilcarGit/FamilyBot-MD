import { actividadConCooldown, COOLDOWN_COSECHAR_MS, MENSAJES_COSECHAR } from '../../lib/economia.js'

export const desc = 'Cosecha del campo para ganar efectivo (cada 45 min)'
export const cooldown = 3

export default async function cosechar({ sock, msg, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const resultado = await actividadConCooldown({
    db,
    jid: jidRemitente,
    campoCooldown: 'ultimoCosechar',
    cooldownMs: COOLDOWN_COSECHAR_MS,
    minGanancia: 30,
    maxGanancia: 150,
    mensajes: MENSAJES_COSECHAR,
    emoji: '🌾',
  })

  await sock.sendMessage(chatId, { text: resultado.texto })
}