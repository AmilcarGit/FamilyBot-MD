import fetch from 'node-fetch'

export const desc = 'Busca videos con Delerius y los descarga mediante FamilyBot-API'
export const alias = ['ytmp4', 'video', 'ytvideo']
export const categoria = 'descargas'
export const cooldown = 10

const DELERIUS_SEARCH = 'https://api.delirius.online/search/ytsearch'
const DELERIUS_DOWNLOAD = 'https://api.delirius.online/download/ytmp4'
const FAMILYBOT_DOWNLOAD = 'https://familybot-md-api.onrender.com/api/download/youtube'
const FAMILYBOT_KEY = 'familybot-md'

const HEADERS = {
  accept: 'application/json, text/plain, */*',
  'user-agent': 'Mozilla/5.0 FamilyBot-MD'
}

function esUrlYoutube(texto) {
  return /(?:youtube\.com|youtu\.be)/i.test(texto)
}

function buscarUrl(data) {
  const valores = [
    data?.url,
    data?.download,
    data?.video,
    data?.data?.url,
    data?.data?.download,
    data?.data?.video,
    data?.data?.download?.url,
    data?.result?.url,
    data?.result?.download,
    data?.result?.video,
    data?.resultado?.url,
    data?.resultado?.download,
    data?.resultado?.video
  ]

  for (const valor of valores) {
    if (typeof valor === 'string' && /^https?:\/\//i.test(valor)) return valor
    if (valor && typeof valor === 'object') {
      const url = valor.url || valor.download || valor.video
      if (typeof url === 'string' && /^https?:\/\//i.test(url)) return url
    }
  }

  return null
}

async function leerRespuestaJson(respuesta, servicio) {
  const contenido = await respuesta.text()
  if (!respuesta.ok) throw new Error(`${servicio} respondió HTTP ${respuesta.status}`)
  if (!contenido.trim()) throw new Error(`${servicio} devolvió una respuesta vacía`)

  try {
    return JSON.parse(contenido)
  } catch {
    throw new Error(`${servicio} no devolvió JSON válido`)
  }
}

async function buscarVideo(query) {
  const url = `${DELERIUS_SEARCH}?q=${encodeURIComponent(query)}`
  const respuesta = await fetch(url, { headers: HEADERS })
  const data = await leerRespuestaJson(respuesta, 'Delerius Search')
  const resultados = Array.isArray(data?.data) ? data.data : []

  if (!data?.status || !resultados.length) return null

  const primero = resultados[0]
  return {
    url: primero.url || primero.link,
    title: primero.title || 'Video de YouTube',
    duration: primero.duration || 'Desconocida',
    author: primero.author?.name || 'Desconocido',
    image: primero.image || primero.thumbnail || null
  }
}

async function descargarConFamilyBot(videoUrl) {
  const url = `${FAMILYBOT_DOWNLOAD}?apiKey=${encodeURIComponent(FAMILYBOT_KEY)}&url=${encodeURIComponent(videoUrl)}&type=video`
  const respuesta = await fetch(url, { headers: HEADERS })
  const tipo = respuesta.headers.get('content-type') || ''

  if (!respuesta.ok) throw new Error(`FamilyBot-API respondió HTTP ${respuesta.status}`)

  if (tipo.includes('video/') || tipo.includes('audio/')) {
    const archivo = Buffer.from(await respuesta.arrayBuffer())
    if (!archivo.length) throw new Error('FamilyBot-API devolvió un archivo vacío')
    return { archivo, title: 'Video de YouTube' }
  }

  const data = await leerRespuestaJson(respuesta, 'FamilyBot-API')
  const downloadUrl = buscarUrl(data)
  if (!downloadUrl) throw new Error('FamilyBot-API no devolvió un enlace de descarga')

  return {
    url: downloadUrl,
    title: data?.title || data?.data?.title || data?.result?.title || 'Video de YouTube',
    duration: data?.duration || data?.data?.duration || data?.result?.duration || 'Desconocida'
  }
}

async function descargarConDelerius(videoUrl) {
  const url = `${DELERIUS_DOWNLOAD}?url=${encodeURIComponent(videoUrl)}`
  const respuesta = await fetch(url, { headers: HEADERS })
  const data = await leerRespuestaJson(respuesta, 'Delerius Download')
  const downloadUrl = buscarUrl(data)
  if (!downloadUrl) throw new Error('Delerius no devolvió un enlace de descarga')

  return {
    url: downloadUrl,
    title: data?.title || data?.data?.title || 'Video de YouTube',
    duration: data?.duration || data?.data?.duration || 'Desconocida'
  }
}

export default async function video({ sock, msg, args, chatId, config }) {
  try {
    const query = args.join(' ').trim()
    if (!query) {
      await sock.sendMessage(chatId, {
        text: `❌ Ingresa un título o enlace de YouTube.\n\nEjemplo: ${config.prefijo}video CR7 mejores goles`
      }, { quoted: msg })
      return
    }

    await sock.sendMessage(chatId, {
      text: '⏳ Buscando video con Delerius...'
    }, { quoted: msg })

    let videoInfo
    if (esUrlYoutube(query)) {
      videoInfo = {
        url: query,
        title: 'Video de YouTube',
        duration: 'Desconocida',
        author: 'YouTube'
      }
    } else {
      videoInfo = await buscarVideo(query)
      if (!videoInfo?.url) {
        await sock.sendMessage(chatId, {
          text: `❌ No se encontraron resultados para: *${query}*`
        }, { quoted: msg })
        return
      }
    }

    await sock.sendMessage(chatId, {
      text: '📥 Resultado encontrado. Descargando mediante FamilyBot-API...'
    }, { quoted: msg })

    let descarga
    let proveedor = 'FamilyBot-API'

    try {
      descarga = await descargarConFamilyBot(videoInfo.url)
    } catch (familyError) {
      console.error('Error FamilyBot-API:', familyError.message)
      proveedor = 'Delerius API'
      descarga = await descargarConDelerius(videoInfo.url)
    }

    const titulo = descarga.title === 'Video de YouTube' ? videoInfo.title : descarga.title
    const duracion = descarga.duration === 'Desconocida' ? videoInfo.duration : descarga.duration
    const caption = `╭━━━〔 📥 *YOUTUBE VIDEO* 〕━━━⬣\n┃ ✧ *Título:* ${titulo}\n┃ ✧ *Duración:* ${duracion}\n┃ ✧ *Autor:* ${videoInfo.author}\n┃ ✧ *Búsqueda:* Delerius API\n┃ ✧ *Descarga:* ${proveedor}\n╰━━━━━━━━━━━━━━━━━━━━━━⬣`

    const mensaje = descarga.archivo
      ? { video: descarga.archivo, mimetype: 'video/mp4', caption: caption.trim() }
      : { video: { url: descarga.url }, mimetype: 'video/mp4', caption: caption.trim() }

    await sock.sendMessage(chatId, mensaje, { quoted: msg })
  } catch (error) {
    console.error('Error en comando video:', error.message)
    await sock.sendMessage(chatId, {
      text: `❌ No se pudo descargar el video.\n\nDetalle: ${error.message}`
    }, { quoted: msg })
  }
}
