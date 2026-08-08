import { Innertube, UniversalCache } from 'youtubei.js'
import { extraerIdYoutube } from '../../lib/utils.js'

export const desc = 'Busca y descarga un video de YouTube'
export const alias = ['ytvideo']
export const cooldown = 8

const DELIRIUS_BASE = 'https://api.delirius.store/download/ytmp4'
const EDWARD_BASE = 'https://dv-edward.onrender.com/api/download/ytvideo'
const EDWARD_API_KEY = 'EdwardwEqIgrqU'

let clienteYt = null

async function obtenerCliente() {
  if (!clienteYt) {
    clienteYt = await Innertube.create({ cache: new UniversalCache(false) })
  }
  return clienteYt
}

function extraerDatosDelirius(json) {
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

async function intentarDelirius(youtubeUrl) {
  try {
    const apiUrl = `${DELIRIUS_BASE}?url=${encodeURIComponent(youtubeUrl)}`
    const respuesta = await fetch(apiUrl)
    const json = await respuesta.json()
    const { url, titulo, calidad } = extraerDatosDelirius(json)

    if (!url) {
      console.error('Delirius sin download_url:', JSON.stringify(json))
      return null
    }

    return { url, titulo, calidad, fuente: 'delirius' }
  } catch (err) {
    console.error('Error consultando Delirius:', err)
    return null
  }
}

async function intentarEdward(youtubeUrl) {
  try {
    const apiUrl = `${EDWARD_BASE}?url=${encodeURIComponent(youtubeUrl)}&apiKey=${EDWARD_API_KEY}`
    const respuesta = await fetch(apiUrl)
    const json = await respuesta.json()

    if (!json?.status || !json?.result?.download_url) {
      console.error('Edward sin download_url:', JSON.stringify(json))
      return null
    }

    return {
      url: json.result.download_url,
      titulo: json.result.title,
      calidad: json.result.quality,
      fuente: 'edward',
    }
  } catch (err) {
    console.error('Error consultando Edward:', err)
    return null
  }
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

  let info = await intentarDelirius(youtubeUrl)
  if (!info) {
    info = await intentarEdward(youtubeUrl)
  }

  if (!info) {
    return sock.sendMessage(chatId, {
      text: `❌ No pude obtener el video con ninguna de las APIs.\n🔗 Puedes verlo directo aquí: ${youtubeUrl}`,
    })
  }

  try {
    const videoRes = await fetch(info.url)
    if (!videoRes.ok) throw new Error(`La descarga respondió ${videoRes.status}`)

    const buffer = Buffer.from(await videoRes.arrayBuffer())
    const titulo = info.titulo || tituloBusqueda

    await sock.sendMessage(chatId, {
      video: buffer,
      mimetype: 'video/mp4',
      caption: `🎬 *${titulo}*${info.calidad ? `\n📺 Calidad: ${info.calidad}` : ''}`,
    })
  } catch (err) {
    console.error(`Error descargando el video (fuente: ${info.fuente}):`, err)
    await sock.sendMessage(chatId, {
      text: `❌ No pude descargar el video.\n🔗 Puedes verlo directo aquí: ${youtubeUrl}`,
    })
  }
}