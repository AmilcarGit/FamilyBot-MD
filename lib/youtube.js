import fetch from 'node-fetch'

const FAMILYBOT_DOWNLOAD = 'https://familybot-md-api.onrender.com/api/download/youtube'
const FAMILYBOT_KEY = 'familybot-md'
const DELERIUS_SEARCH = 'https://api.delirius.online/search/ytsearch'
const DELERIUS_DOWNLOAD = 'https://api.delirius.online/download/ytmp4'

const HEADERS = {
  accept: 'application/json, text/plain, */*',
  'user-agent': 'Mozilla/5.0 FamilyBot-MD'
}

function extraerUrl(data) {
  const valores = [
    data?.url,
    data?.download,
    data?.video,
    data?.audio,
    data?.link,
    data?.data?.url,
    data?.data?.download,
    data?.data?.video,
    data?.data?.audio,
    data?.data?.link,
    data?.result?.url,
    data?.result?.download,
    data?.result?.video,
    data?.result?.audio,
    data?.result?.link,
    data?.resultado?.url,
    data?.resultado?.download,
    data?.resultado?.video,
    data?.resultado?.audio,
    data?.resultado?.link
  ]

  for (const valor of valores) {
    if (typeof valor === 'string' && /^https?:\/\//i.test(valor)) return valor
    if (valor && typeof valor === 'object') {
      const url = valor.url || valor.download || valor.video || valor.audio || valor.link
      if (typeof url === 'string' && /^https?:\/\//i.test(url)) return url
    }
  }

  return null
}

async function leerJson(respuesta, servicio) {
  const contenido = await respuesta.text()
  if (!respuesta.ok) throw new Error(`${servicio} respondió HTTP ${respuesta.status}`)
  if (!contenido.trim()) throw new Error(`${servicio} devolvió una respuesta vacía`)
  try {
    return JSON.parse(contenido)
  } catch {
    throw new Error(`${servicio} no devolvió JSON válido`)
  }
}

function normalizarResultado(item) {
  return {
    url: item?.url || item?.link || item?.videoId || null,
    title: item?.title || item?.titulo || 'Video de YouTube',
    duration: item?.duration || item?.duracion || 'Desconocida',
    author: item?.author?.name || item?.author || item?.channel?.name || 'Desconocido',
    image: item?.image || item?.thumbnail || item?.portada || null
  }
}

export async function buscarYouTube(query) {
  const endpoint = `${DELERIUS_SEARCH}?q=${encodeURIComponent(query)}`
  const respuesta = await fetch(endpoint, { headers: HEADERS })
  const data = await leerJson(respuesta, 'Delerius Search')
  const lista = Array.isArray(data?.data) ? data.data : Array.isArray(data?.resultado) ? data.resultado : []
  return lista.slice(0, 5).map(normalizarResultado).filter(item => item.url)
}

async function descargarFamilyBot(videoUrl, type) {
  const endpoint = `${FAMILYBOT_DOWNLOAD}?apiKey=${encodeURIComponent(FAMILYBOT_KEY)}&url=${encodeURIComponent(videoUrl)}&type=${encodeURIComponent(type)}`
  const respuesta = await fetch(endpoint, { headers: HEADERS })
  const contentType = respuesta.headers.get('content-type') || ''

  if (!respuesta.ok) throw new Error(`FamilyBot-API respondió HTTP ${respuesta.status}`)

  if (contentType.includes('video/') || contentType.includes('audio/')) {
    const archivo = Buffer.from(await respuesta.arrayBuffer())
    if (!archivo.length) throw new Error('FamilyBot-API devolvió un archivo vacío')
    return { archivo, type }
  }

  const data = await leerJson(respuesta, 'FamilyBot-API')
  const url = extraerUrl(data)
  if (!url) throw new Error('FamilyBot-API no devolvió un enlace multimedia')

  return {
    url,
    title: data?.title || data?.data?.title || data?.result?.title || 'Contenido de YouTube',
    duration: data?.duration || data?.data?.duration || data?.result?.duration || 'Desconocida',
    type
  }
}

async function descargarDelerius(videoUrl) {
  const endpoint = `${DELERIUS_DOWNLOAD}?url=${encodeURIComponent(videoUrl)}`
  const respuesta = await fetch(endpoint, { headers: HEADERS })
  const data = await leerJson(respuesta, 'Delerius Download')
  const url = extraerUrl(data)
  if (!url) throw new Error('Delerius no devolvió un enlace de video')
  return { url, type: 'video' }
}

export async function descargarYouTube(videoUrl, type = 'video') {
  try {
    return { ...(await descargarFamilyBot(videoUrl, type)), provider: 'FamilyBot-API' }
  } catch (familyError) {
    if (type !== 'video') throw familyError
    const respaldo = await descargarDelerius(videoUrl)
    return { ...respaldo, provider: 'Delerius API' }
  }
}

export function esEnlaceYouTube(texto) {
  return /(?:youtube\.com|youtu\.be)/i.test(texto)
}

export function limpiarTitulo(texto) {
  return String(texto || 'Video de YouTube').replace(/[\n\r]+/g, ' ').trim().slice(0, 90)
}
