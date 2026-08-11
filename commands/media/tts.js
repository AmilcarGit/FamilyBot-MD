const TTS_BASE = 'https://translate.google.com/translate_tts'
const LIMITE_CARACTERES = 200
const TIMEOUT_MS = 15000

async function fetchConTimeout(url, opciones = {}) {
  const controlador = new AbortController()
  const idTimeout = setTimeout(() => controlador.abort(), TIMEOUT_MS)

  try {
    return await fetch(url, { ...opciones, signal: controlador.signal })
  } finally {
    clearTimeout(idTimeout)
  }
}

export const desc = 'Convierte texto en un mensaje de voz'
export const alias = ['texttospeech', 'voz']
export const cooldown = 5

export default async function tts({ sock, args, chatId }) {
  const texto = args.join(' ').trim()

  if (!texto) {
    return sock.sendMessage(chatId, {
      text: '❀ Escribe el texto que quieres convertir a voz.\nEjemplo: tts Hola, este es un mensaje de prueba',
    })
  }

  if (texto.length > LIMITE_CARACTERES) {
    return sock.sendMessage(chatId, {
      text: `❌ El texto es muy largo (máximo ${LIMITE_CARACTERES} caracteres). El tuyo tiene ${texto.length}.`,
    })
  }

  try {
    const url = `${TTS_BASE}?ie=UTF-8&q=${encodeURIComponent(texto)}&tl=es&client=tw-ob`
    const respuesta = await fetchConTimeout(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Referer: 'https://translate.google.com/',
      },
    })

    if (!respuesta.ok) throw new Error(`La API respondió ${respuesta.status}`)

    const buffer = Buffer.from(await respuesta.arrayBuffer())

    if (buffer.length < 1000) {
      console.log('⚠️ Audio de TTS demasiado pequeño, primeros bytes:', buffer.subarray(0, 100).toString('utf8'))
      return sock.sendMessage(chatId, {
        text: '❌ No pude generar el audio, intenta con un texto más corto o inténtalo de nuevo.',
      })
    }

    await sock.sendMessage(chatId, {
      audio: buffer,
      mimetype: 'audio/mpeg',
      ptt: true,
    })
  } catch (err) {
    console.log('❌ Error generando texto a voz:', err.message)
    await sock.sendMessage(chatId, { text: '❌ No pude generar el audio en este momento.' })
  }
}