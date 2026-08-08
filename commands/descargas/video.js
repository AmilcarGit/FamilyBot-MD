import { Innertube, UniversalCache } from 'youtubei.js'
import { extraerIdYoutube } from '../../lib/utils.js'

export const desc = 'Busca y descarga un video de YouTube'
export const alias = ['ytvideo', 'vid']
export const cooldown = 10

const API_DELIRIUS = 'https://api.delirius.store/download/ytmp4'

let clienteYt = null

async function obtenerCliente() {
  if (!clienteYt) {
    clienteYt = await Innertube.create({ cache: new UniversalCache(false) })
  }
  return clienteYt
}

export default async function video({ sock, chatId, args, config }) {
  const entrada = args.join(' ').trim()

  if (!entrada) {
    return sock.sendMessage(chatId, {
      text: `❀ Escribe el nombre del video o pega un link de YouTube.\nEjemplo: *${config.prefijo}video shape of you*`,
    })
  }

  const idDirecto = extraerIdYoutube(entrada)
  let youtubeUrl
  let tituloVideo = ''
  let miniatura = ''

  if (idDirecto) {
    youtubeUrl = `https://www.youtube.com/watch?v=${idDirecto}`
  } else {
    await sock.sendMessage(chatId, { text: `🔎 Buscando *${entrada}* en YouTube...` })

    let yt
    try {
      yt = await obtenerCliente()
      const busqueda = await yt.search(entrada, { type: 'video' })
      const resultado = busqueda?.videos?.[0]

      if (!resultado) {
        return sock.sendMessage(chatId, { text: '❌ No encontré resultados para esa búsqueda.' })
      }

      youtubeUrl = `https://www.youtube.com/watch?v=${resultado.id}`
      tituloVideo = resultado.title
      miniatura = resultado.thumbnails?.[0]?.url || ''
    } catch (err) {
      console.error('Error buscando en YouTube:', err)
      return sock.sendMessage(chatId, { text: '❌ Ocurrió un error al buscar en YouTube.' })
    }
  }

  await sock.sendMessage(chatId, { text: '⏳ Procesando descarga, por favor espera...' })

  try {
    const response = await fetch(`${API_DELIRIUS}?url=${encodeURIComponent(youtubeUrl)}`)
    const data = await response.json()

    if (!data.status || !data.data?.download?.url) {
      return sock.sendMessage(chatId, {
        text: `❌ La API de descarga no pudo procesar este video.\n🔗 Puedes verlo aquí: ${youtubeUrl}`,
      })
    }

    const { title, author, views, duration } = data.data
    const downloadUrl = data.data.download.url
    const filename = data.data.download.filename || 'video.mp4'

    const infoTexto = `🎬 *${title || tituloVideo}*\n` +
                      `👤 *Autor:* ${author || 'Desconocido'}\n` +
                      `👁️ *Vistas:* ${views || '---'}\n` +
                      `⏱️ *Duración:* ${duration || '---'}\n\n` +
                      `📥 Enviando video...`

    // Intentamos enviar el video
    await sock.sendMessage(chatId, {
      video: { url: downloadUrl },
      fileName: filename,
      mimetype: 'video/mp4',
      caption: infoTexto
    })

  } catch (error) {
    console.error('Error con la API de Delirius:', error)
    await sock.sendMessage(chatId, {
      text: `❌ Hubo un fallo al obtener el video con la nueva API.\n🔗 Link directo: ${youtubeUrl}`
    })
  }
}
