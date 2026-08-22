import fetch from 'node-fetch'

export const desc = 'Envía un abrazo animado con una reacción anime'
export const alias = ['hug', 'abrazar']
export const categoria = 'social'
export const cooldown = 5

const API_URL = 'https://familybot-md-api.onrender.com/api/anime/reaction'
const API_KEY = 'familybot-md'

function extraerUrl(data) {
  const valores = [
    data?.url,
    data?.image,
    data?.imageUrl,
    data?.gif,
    data?.video,
    data?.data?.url,
    data?.data?.image,
    data?.data?.imageUrl,
    data?.data?.gif,
    data?.data?.video,
    data?.result?.url,
    data?.result?.image,
    data?.result?.imageUrl,
    data?.result?.gif,
    data?.resultado?.url,
    data?.resultado?.image,
    data?.resultado?.gif
  ]

  return valores.find(valor => {
    return typeof valor === 'string' && /^https?:\/\//i.test(valor)
  }) || null
}

function obtenerMencion(msg) {
  const contexto = msg?.message?.extendedTextMessage?.contextInfo || msg?.message?.contextInfo || {}
  return contexto.mentionedJid?.[0] || null
}

function obtenerNombreObjetivo(msg, mencionado) {
  if (mencionado) return `@${mencionado.split('@')[0]}`

  const participante = msg?.key?.participant || msg?.key?.remoteJid
  if (participante && !participante.endsWith('@g.us')) {
    return `@${participante.split('@')[0]}`
  }

  return 'toda la familia'
}

export default async function abrazo({ sock, chatId, msg, config }) {
  try {
    const mencionado = obtenerMencion(msg)
    const nombreBot = config?.nombreBot || 'FamilyBot-MD'
    const objetivo = obtenerNombreObjetivo(msg, mencionado)
    const endpoint = `${API_URL}?apiKey=${encodeURIComponent(API_KEY)}&type=hug`

    await sock.sendMessage(chatId, {
      text: '🫂 *Preparando un abrazo neural animado...*'
    }, { quoted: msg })

    const respuesta = await fetch(endpoint, {
      headers: {
        accept: 'application/json',
        'user-agent': 'FamilyBot-MD/1.0'
      }
    })

    const contenido = await respuesta.text()

    if (!respuesta.ok) {
      throw new Error(`La API respondió con HTTP ${respuesta.status}`)
    }

    let data
    try {
      data = JSON.parse(contenido)
    } catch {
      throw new Error('La API no devolvió un JSON válido')
    }

    const mediaUrl = extraerUrl(data)
    if (!mediaUrl) {
      throw new Error('La respuesta no contiene una URL multimedia')
    }

    const texto = `🫂 *Abrazo neural*\n\n${objetivo} recibió un abrazo de la familia.\n\n✨ *Powered by ${nombreBot}*`

    await sock.sendMessage(chatId, {
      video: { url: mediaUrl },
      gifPlayback: true,
      caption: texto,
      mentions: mencionado ? [mencionado] : []
    }, { quoted: msg })
  } catch (error) {
    console.error('Error en abrazo:', error.message)

    await sock.sendMessage(chatId, {
      text: '❌ No pude obtener el GIF del abrazo desde FamilyBot-API. Comprueba que la API devuelva una URL multimedia válida.'
    }, { quoted: msg })
  }
}
