import { Innertube, UniversalCache } from 'youtubei.js'
import { extraerIdYoutube } from '../../lib/utils.js'

export const desc = 'Busca y descarga una canción de YouTube en audio'
export const cooldown = 8

const API_BASE = 'https://dv-yer-api.online/ytmp3'
const API_KEY = 'dvyer673989047548'

let clienteYt = null

async function obtenerCliente() {
  if (!clienteYt) {
    clienteYt = await Innertube.create({ cache: new UniversalCache(false) })
  }
  return clienteYt
}

export default async function play({ sock, chatId, args }) {
  const entrada = args.join(' ').trim()

  if (!entrada) {
    return sock.sendMessage(chatId, {
      text: '❀ Escribe el nombre de la canción o pega un link de YouTube.\nEjemplo: play shape of you',
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

    let video
    try {
      const busqueda = await yt.search(entrada, { type: 'video' })
      video = busqueda?.videos?.[0]
    } catch (err) {
      return sock.sendMessage(chatId, { text: '❌ Ocurrió un error buscando en YouTube.' })
    }

    if (!video) {
      return sock.sendMessage(chatId, { text: '❌ No encontré resultados para esa búsqueda.' })
    }

    youtubeUrl = `https://www.youtube.com/watch?v=${video.id}`
    tituloBusqueda = video.title
  }

  let datos
  try {
    const apiUrl = `${API_BASE}?mode=link&url=${encodeURIComponent(youtubeUrl)}&apikey=${API_KEY}`
    const respuesta = await fetch(apiUrl)
    datos = await respuesta.json()
  } catch (err) {
    console.error('Error consultando la API de play:', err)
    return sock.sendMessage(chatId, { text: '❌ Ocurrió un error consultando la API de descarga.' })
  }

  if (!datos?.ok || !datos?.download_url) {
    return sock.sendMessage(chatId, {
      text: `❌ No pude obtener el audio.\n🔗 Puedes escucharlo directo aquí: ${youtubeUrl}`,
    })
  }

  try {
    const audioRes = await fetch(datos.download_url)
    if (!audioRes.ok) throw new Error(`La API respondió ${audioRes.status}`)

    const buffer = Buffer.from(await audioRes.arrayBuffer())
    const titulo = datos.title || tituloBusqueda

    await sock.sendMessage(chatId, {
      audio: buffer,
      mimetype: datos.mime_type || 'audio/mp4',
      fileName: `${titulo}.m4a`,
    })
  } catch (err) {
    console.error('Error descargando el audio de la API:', err)
    await sock.sendMessage(chatId, {
      text: `❌ No pude descargar el audio.\n🔗 Puedes escucharlo directo aquí: ${youtubeUrl}`,
    })
  }
}
