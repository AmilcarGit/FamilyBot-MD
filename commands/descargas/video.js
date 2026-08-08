import { Innertube, UniversalCache } from 'youtubei.js'
import { extraerIdYoutube } from '../../lib/utils.js'

export const desc = 'Busca y descarga un video de YouTube'
export const alias = ['ytvideo']
export const cooldown = 8

const API_BASE = 'https://api.delirius.store/download/ytmp4'

let clienteYt = null

async function obtenerCliente() {
  if (!clienteYt) {
    clienteYt = await Innertube.create({ cache: new UniversalCache(false) })
  }
  return clienteYt
}

function extraerDatosApi(json) {
  const data = json?.data || json?.result || json

  const url =
    data?.download?.url ||
    data?.download_url ||
    data?.dl_url ||
    data?.url ||
    (typeof data?.download === 'string' ? data.download : null)

  const titulo = data?.title || data?.judul || data?.videoTitle
  const calidad = data?.quality || data?.download?.quality || data?.resolution

  return { url, titulo, calidad }
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

  let json
  try {
    const apiUrl = `${API_BASE}?url=${encodeURIComponent(youtubeUrl)}`
    const respuesta = await fetch(apiUrl)
    json = await respuesta.json()
  } catch (err) {
    console.error('Error consultando la API de video:', err)
    return sock.sendMessage(chatId, { text: '❌ Ocurrió un error consultando la API de descarga.' })
  }

  const { url: downloadUrl, titulo, calidad } = extraerDatosApi(json)

  if (!downloadUrl) {
    console.error('Respuesta inesperada de la API de video:', JSON.stringify(json))
    return sock.sendMessage(chatId, {
      text: `❌ No pude obtener el video.\n🔗 Puedes verlo directo aquí: ${youtubeUrl}`,
    })
  }

  try {
    const videoRes = await fetch(downloadUrl)
    if (!videoRes.ok) throw new Error(`La descarga respondió ${videoRes.status}`)

    const buffer = Buffer.from(await videoRes.arrayBuffer())

    await sock.sendMessage(chatId, {
      video: buffer,
      mimetype: 'video/mp4',
      caption: `🎬 *${titulo || tituloBusqueda}*${calidad ? `\n📺 Calidad: ${calidad}` : ''}`,
    })
  } catch (err) {
    console.error('Error descargando el video de la API:', err)
    await sock.sendMessage(chatId, {
      text: `❌ No pude descargar el video.\n🔗 Puedes verlo directo aquí: ${youtubeUrl}`,
    })
  }
}