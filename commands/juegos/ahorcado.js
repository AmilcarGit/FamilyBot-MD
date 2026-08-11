import {
  PALABRAS_AHORCADO,
  obtenerAhorcadoActivo,
  iniciarAhorcado,
  normalizarTexto,
} from '../../lib/juegos.js'

export const desc = 'Inicia una partida de ahorcado'
export const cooldown = 5

const INTENTOS_INICIALES = 6

function representacion(palabra, letrasUsadas) {
  return palabra
    .split('')
    .map((letra) => (letrasUsadas.includes(letra) ? letra : '_'))
    .join(' ')
}

export default async function ahorcado({ sock, chatId, config }) {
  if (obtenerAhorcadoActivo(chatId)) {
    return sock.sendMessage(chatId, {
      text: `❀ Ya hay un ahorcado activo. Adivina letras con *${config.prefijo}letra <letra>*.`,
    })
  }

  const palabra = normalizarTexto(
    PALABRAS_AHORCADO[Math.floor(Math.random() * PALABRAS_AHORCADO.length)]
  )

  iniciarAhorcado(chatId, {
    palabra,
    letrasUsadas: [],
    intentosRestantes: INTENTOS_INICIALES,
  })

  await sock.sendMessage(chatId, {
    text:
      `🔤 *Ahorcado*\n\n${representacion(palabra, [])}\n\n` +
      `❤️ Intentos: ${INTENTOS_INICIALES}\n` +
      `Adivina letras con *${config.prefijo}letra <letra>*`,
  })
}