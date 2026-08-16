import { obtenerTriviaActiva, finalizarTrivia, normalizarTexto } from '../../lib/juegos.js'
import { obtenerUsuario } from '../../lib/economia.js'
import { resolverNumeroReal } from '../../lib/utils.js'

export const desc = 'Responde la trivia activa en el chat'
export const alias = ['r']
export const cooldown = 2

export default async function responder({ sock, msg, args, chatId, db }) {
  const trivia = obtenerTriviaActiva(chatId)

  if (!trivia) {
    return sock.sendMessage(chatId, { text: '❌ No hay ninguna trivia activa. Usa *trivia* para iniciar una.' })
  }

  const respuestaUsuario = normalizarTexto(args.join(' '))

  if (!respuestaUsuario) {
    return sock.sendMessage(chatId, { text: '❀ Escribe tu respuesta después del comando.' })
  }

  if (respuestaUsuario !== normalizarTexto(trivia.respuesta)) {
    return sock.sendMessage(chatId, { text: '❌ Respuesta incorrecta, sigue intentando.' })
  }

  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const eco = await obtenerUsuario(db, jidRemitente)
  eco.saldo += trivia.premio
  await db.write()

  finalizarTrivia(chatId)

  const numero = await resolverNumeroReal(sock, jidRemitente, msg)
  await sock.sendMessage(chatId, {
    text: `🎉 @${numero} respondió correctamente y ganó ${trivia.premio} de efectivo.`,
    mentions: [jidRemitente],
  })
}