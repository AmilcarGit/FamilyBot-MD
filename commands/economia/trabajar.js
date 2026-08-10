import { actividadConCooldown, COOLDOWN_TRABAJAR_MS, MENSAJES_TRABAJAR } from '../../lib/economia.js'

export const desc = 'Trabaja para ganar efectivo (cada 1 hora)'
export const cooldown = 3

export default async function trabajar({ sock, msg, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const resultado = await actividadConCooldown({
    db,
    jid: jidRemitente,
    campoCooldown: 'ultimoTrabajar',
    cooldownMs: COOLDOWN_TRABAJAR_MS,
    minGanancia: 100,
    maxGanancia: 400,
    mensajes: MENSAJES_TRABAJAR,
    emoji: '💼',
  })

  await sock.sendMessage(chatId, { text: resultado.texto })
}