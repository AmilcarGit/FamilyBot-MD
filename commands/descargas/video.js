import { Innertube, UniversalCache } from 'youtubei.js'

export const desc = 'Busca y descarga un video de YouTube'
export const alias = ['ytvideo']
export const cooldown = 8

const API_BASE = 'https://dv-yer-api.online/ytmp4'
const CALIDAD_DEFECTO = '360p'

let clienteYt = null

async function obtenerCliente() {
  if (!clienteYt) {
    clienteYt = await Innertube.create({ cache: new UniversalCache(false) })
  }
  return clienteYt
}

export default async function video({ sock, chatId, args }) {
  const consulta = args.join(' ').trim()

  if (!consulta) {
    return sock.sendMessage(chatId, {
      text: '❀ Escribe el nombre del video.\nEjemplo: video shape of you',
    })
  }

  await sock.sendMessage(chatId, { text: `🔎 Buscando *${consulta}*...` })

  let yt
  try {
    yt = await obtenerCliente()
  } catch (err) {
    return sock.sendMessage(chatId, { text: '❌ No pude conectar con YouTube.' })
  }

  let resultado
  try {
    const busqueda = await yt.search(consulta, { type: 'video' })
    resultado = busqueda?.videos?.[0]
  } catch (err) {
    return sock.sendMessage(chatId, { text: '❌ Ocurrió un error buscando en YouTube.' })
  }

  if (!resultado) {
    return sock.sendMessage(chatId, { text: '❌ No encontré resultados para esa búsqueda.' })
  }

  const youtubeUrl = `https://www.youtube.com/watch?v=${resultado.id}`

  let datos
  try {
    const apiUrl = `${API_BASE}?mode=link&url=${encodeURIComponent(youtubeUrl)}&quality=${CALIDAD_DEFECTO}`
    const respuesta = await fetch(apiUrl)
    datos = await respuesta.json()
  } catch (err) {
    console.error('Error consultando la API de video:', err)
    return sock.sendMessage(chatId, { text: '❌ Ocurrió un error consultando la API de descarga.' })
  }

  if (!datos?.ok || !datos?.download_url) {
    return sock.sendMessage(chatId, {
      text: `❌ No pude obtener el video.\n🔗 Puedes verlo directo aquí: ${youtubeUrl}`,
    })
  }

  try {
    const videoRes = await fetch(datos.download_url)
    if (!videoRes.ok) throw new Error(`La API respondió ${videoRes.status}`)

    const buffer = Buffer.from(await videoRes.arrayBuffer())
    const titulo = datos.title || resultado.title

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
