import { normalizarJid, obtenerJidMencionado, resolverNumeroReal } from '../../lib/utils.js'
import { obtenerUsuario, formatearTiempoRestante, COOLDOWN_ROBAR_MS } from '../../lib/economia.js'

export const desc = 'Intenta robarle efectivo a otro usuario (cada 20 min)'
export const cooldown = 3

export default async function robar({ sock, msg, args, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const jidObjetivo = obtenerJidMencionado(msg, args)

  if (!jidObjetivo) {
    return sock.sendMessage(chatId, {
      text: '❀ Menciona, responde o escribe el número de a quién quieres robar.',
    })
  }

  if (normalizarJid(jidObjetivo) === normalizarJid(jidRemitente)) {
    return sock.sendMessage(chatId, { text: '❌ No puedes robarte a ti mismo.' })
  }

  const ecoLadron = await obtenerUsuario(db, jidRemitente)
  const ahora = Date.now()
  const restante = ecoLadron.ultimoRobar + COOLDOWN_ROBAR_MS - ahora

  if (restante > 0) {
    return sock.sendMessage(chatId, {
      text: `⏳ Espera ${formatearTiempoRestante(restante)} para volver a robar.`,
    })
  }

  const ecoVictima = await obtenerUsuario(db, jidObjetivo)

  if (ecoVictima.escudoHasta > Date.now()) {
    const numeroObjetivo = await resolverNumeroReal(sock, jidObjetivo)
    return sock.sendMessage(chatId, {
      text: `🛡️ @${numeroObjetivo} tiene un escudo antirrobo activo, no puedes robarle.`,
      mentions: [jidObjetivo],
    })
  }

  if (ecoVictima.saldo < 100) {
    return sock.sendMessage(chatId, { text: '❌ Esa persona no tiene suficiente efectivo para robarle.' })
  }

  ecoLadron.ultimoRobar = ahora
  await db.write()

  const exito = Math.random() < 0.5

  if (exito) {
    const monto = Math.floor(Math.random() * (ecoVictima.saldo * 0.4)) + 1
    ecoVictima.saldo -= monto
    ecoLadron.saldo += monto
    await db.write()

    const numeroObjetivo = await resolverNumeroReal(sock, jidObjetivo)
    return sock.sendMessage(chatId, {
      text: `🦹 Robaste ${monto} de efectivo a @${numeroObjetivo}.`,
      mentions: [jidObjetivo],
    })
  }

  const multa = Math.floor(Math.random() * 100) + 50
  ecoLadron.saldo = Math.max(0, ecoLadron.saldo - multa)
  await db.write()

  const numeroObjetivo = await resolverNumeroReal(sock, jidObjetivo)
  await sock.sendMessage(chatId, {
    text: `🚨 Te atraparon robando a @${numeroObjetivo} y pagaste una multa de ${multa}.`,
    mentions: [jidObjetivo],
  })
}