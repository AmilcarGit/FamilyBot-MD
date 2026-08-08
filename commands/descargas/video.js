import { Innertube, UniversalCache } from 'youtubei.js'
import { extraerIdYoutube } from '../../lib/utils.js'

export const desc = 'Busca y descarga un video de YouTube'
export const alias = ['ytvideo']
export const cooldown = 8

const API_BASE = 'https://dv-yer-api.online/ytmp4'
const API_KEY = 'dvyer323465187836'
const CALIDAD_DEFECTO = '360p'

let clienteYt = null

async function obtenerCliente() {
  if (!clienteYt) {
    clienteYt = await Innertube.create({ cache: new UniversalCache(false) })
  }
  return clienteYt
}

export default async function video({ sock, chatId, args }) {
  const entrada = args.join(' ').trim()

  if (!entrada) {
    return sock.sendMessage(chatId, {
      text: '❀ Escribe el nombre del video o pega un link de YouTube.\nEjemplo: video shape of you',
    })
  }

  const idDirecto = extraerIdYoutube(entrada)
  let youtubeUrl
  let tituloBusqueda = entrada

  if (idDirecto) {
    youtubeUrl = `https://www.youtube.com/watch?v=${idDirecto}`
  } else {
    await sock.sendMessage(chatId, { text: `🔎 Buscando *${entrada}*...` })

    let yt
    try {
      yt = await obtenerCliente()
    } catch (err) {
      return sock.sendMessage(chatId, { text: '❌ No pude conectar con YouTube.' })
    }

    let resultado
    try {
      const busqueda = await yt.search(entrada, { type: 'video' })
      resultado = busqueda?.videos?.[0]
    } catch (err) {
      return sock.sendMessage(chatId, { text: '❌ Ocurrió un error buscando en YouTube.' })
    }

    if (!resultado) {
      return sock.sendMessage(chatId, { text: '❌ No encontré resultados para esa búsqueda.' })
    }

    youtubeUrl = `https://www.youtube.com/watch?v=${resultado.id}`
    tituloBusqueda = resultado.title
  }

  let datos
  try {
    const apiUrl = `${API_BASE}?mode=link&url=${encodeURIComponent(youtubeUrl)}&quality=${CALIDAD_DEFECTO}&apikey=${API_KEY}`
    const respuesta = await fetch(apiUrl, {
      headers: {
        apikey: API_KEY,
        'x-api-key': API_KEY,
      },
    })
    datos = await respuesta.json()
  } catch (err) {
    console.error('Error consultando la API de video:', err)
    return sock.sendMessage(chatId, { text: '❌ Ocurrió un error consultando la API de descarga.' })
  }

  if (!datos?.ok || !datos?.download_url) {
    console.error('Respuesta inesperada de la API de video:', JSON.stringify(datos))
    return sock.sendMessage(chatId, {
      text: `❌ No pude obtener el video.\n🔗 Puedes verlo directo aquí: ${youtubeUrl}`,
    })
  }

  try {
    const videoRes = await fetch(datos.download_url, {
      headers: { apikey: API_KEY },
    })
    if (!videoRes.ok) throw new Error(`La API respondió ${videoRes.status}`)

    const buffer = Buffer.from(await videoRes.arrayBuffer())
    const titulo = datos.title || tituloBusqueda

    await sock.sendMessage(chatId, {
      video: buffer,
      mimetype: 'video/mp4',
      caption: `🎬 *${titulo}*\n📺 Calidad: ${datos.quality || CALIDAD_DEFECTO}`,
    })
  } catch (err) {
    console.error('Error descargando el video de la API:', err)
    await sock.sendMessage(chatId, {
      text: `❌ No pude descargar el video.\n🔗 Puedes verlo directo aquí: ${youtubeUrl}`,
    })
  }
}