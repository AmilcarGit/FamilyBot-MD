import { obtenerUsuario, COOLDOWN_DIARIO_MS, formatearTiempoRestante } from '../../lib/economia.js'

export const desc = 'Reclama tu recompensa diaria (con racha)'
export const cooldown = 3

export default async function diario({ sock, msg, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const eco = await obtenerUsuario(db, jidRemitente)

  const ahora = Date.now()
  const restante = eco.ultimoDiario + COOLDOWN_DIARIO_MS - ahora

  if (restante > 0) {
    return sock.sendMessage(chatId, {
      text: `⏳ Ya reclamaste tu diario. Vuelve en ${formatearTiempoRestante(restante)}.`,
    })
  }

  const unDiaMs = 24 * 60 * 60 * 1000
  const rachaActiva = eco.ultimoDiario > 0 && ahora - eco.ultimoDiario <= unDiaMs * 2
  eco.racha = rachaActiva ? (eco.racha || 0) + 1 : 1

  const bono = Math.min(eco.racha * 50, 500)
  let ganancia = 200 + bono
  let textoMultiplicador = ''

  if (eco.multiplicadorActivo) {
    ganancia *= 2
    eco.multiplicadorActivo = false
    textoMultiplicador = '\n✨ ¡Tu multiplicador duplicó el diario!'
  }

  eco.saldo += ganancia
  eco.ultimoDiario = ahora
  await db.write()

  await sock.sendMessage(chatId, {
    text: `🎁 Reclamaste tu recompensa diaria.\n\n💵 Ganaste ${ganancia} de efectivo.\n🔥 Racha: ${eco.racha} día(s)${textoMultiplicador}`,
  })
}