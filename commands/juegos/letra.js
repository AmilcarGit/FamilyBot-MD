import { obtenerAhorcadoActivo, finalizarAhorcado, dibujarAhorcado, normalizarTexto } from '../../lib/juegos.js'
import { obtenerUsuario } from '../../lib/economia.js'

export const desc = 'Adivina una letra en el ahorcado activo'
export const cooldown = 2

const PREMIO = 150

function representacion(palabra, letrasUsadas) {
  return palabra
    .split('')
    .map((letra) => (letrasUsadas.includes(letra) ? letra : '_'))
    .join(' ')
}

export default async function letra({ sock, msg, args, chatId, db, config }) {
  const juego = obtenerAhorcadoActivo(chatId)

  if (!juego) {
    return sock.sendMessage(chatId, { text: `❌ No hay ningún ahorcado activo. Usa *${config.prefijo}ahorcado* para iniciar uno.` })
  }

  const letra = normalizarTexto(args[0] || '')

  if (!letra || letra.length !== 1) {
    return sock.sendMessage(chatId, { text: '❀ Escribe una sola letra. Ejemplo: letra a' })
  }

  if (juego.letrasUsadas.includes(letra)) {
    return sock.sendMessage(chatId, { text: '⚠️ Ya intentaste con esa letra.' })
  }

  juego.letrasUsadas.push(letra)

  if (!juego.palabra.includes(letra)) {
    juego.intentosRestantes--
  }

  const gano = juego.palabra.split('').every((l) => juego.letrasUsadas.includes(l))
  const perdio = juego.intentosRestantes <= 0

  if (gano) {
    const jidRemitente = msg.key.participant || msg.key.remoteJid
    const eco = await obtenerUsuario(db, jidRemitente)
    eco.saldo += PREMIO
    await db.write()

    finalizarAhorcado(chatId)

    return sock.sendMessage(chatId, {
      text: `🎉 ¡@${jidRemitente.split('@')[0]} completó la palabra *${juego.palabra}* y ganó ${PREMIO} de efectivo!`,
      mentions: [jidRemitente],
    })
  }

  if (perdio) {
    finalizarAhorcado(chatId)

    return sock.sendMessage(chatId, {
      text: `💀 Se acabaron los intentos. La palabra era: *${juego.palabra}*`,
    })
  }

  await sock.sendMessage(chatId, {
    text:
      `${dibujarAhorcado(juego.intentosRestantes)}\n\n` +
      `${representacion(juego.palabra, juego.letrasUsadas)}\n\n` +
      `❤️ Intentos: ${juego.intentosRestantes}\n` +
      `🔤 Usadas: ${juego.letrasUsadas.join(', ') || 'ninguna'}`,
  })
}