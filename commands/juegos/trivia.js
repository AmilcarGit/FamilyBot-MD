import {
  PREGUNTAS_TRIVIA,
  obtenerTriviaActiva,
  iniciarTrivia,
  finalizarTrivia,
} from '../../lib/juegos.js'

export const desc = 'Inicia una ronda de trivia'
export const cooldown = 5

const DURACION_MS = 60 * 1000
const PREMIO = 150

export default async function trivia({ sock, chatId, config }) {
  if (obtenerTriviaActiva(chatId)) {
    return sock.sendMessage(chatId, {
      text: `❀ Ya hay una trivia activa. Responde con *${config.prefijo}responder <tu respuesta>*.`,
    })
  }

  const { pregunta, respuesta } = PREGUNTAS_TRIVIA[Math.floor(Math.random() * PREGUNTAS_TRIVIA.length)]

  const timeoutId = setTimeout(async () => {
    if (obtenerTriviaActiva(chatId)) {
      finalizarTrivia(chatId)
      await sock.sendMessage(chatId, {
        text: `⏳ Se acabó el tiempo. La respuesta era: *${respuesta}*.`,
      })
    }
  }, DURACION_MS)

  iniciarTrivia(chatId, { respuesta, premio: PREMIO, timeoutId })

  await sock.sendMessage(chatId, {
    text: `🧠 *Trivia*\n\n${pregunta}\n\n💰 Premio: ${PREMIO}\n⏳ Tienes 60 segundos.\nResponde con *${config.prefijo}responder <respuesta>*`,
  })
}