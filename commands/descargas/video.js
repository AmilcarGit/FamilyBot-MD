import { getResult } from '../../lib/tempStore.js'

export const desc = 'Busca y descarga el video de YouTube.'
export const alias = ['vid', 'v']
export const cooldown = 10

export default async function video({ sock, chatId, args, m, config }) {
  let query = args.join(' ').trim()
  
  if (!query) {
    return sock.sendMessage(chatId, {
      text: `❌ Por favor, ingresa el nombre de un video, un link o el número del buscador.\nEjemplo: *${config.prefijo}video 1*`
    })
  }

  const index = parseInt(query)
  if (!isNaN(index) && index > 0 && index <= 10) {
    const result = getResult(chatId, index)
    if (result) {
      query = result.url
    }
  }

  try {
    const apiKeyEdward = 'EdwardwEqIgrqU'
    let url = query

    if (!query.includes('youtube.com') && !query.includes('youtu.be')) {
      await sock.sendMessage(chatId, { text: `🔍 Buscando *"${query}"*...` }, { quoted: m })
      
      const searchUrl = `https://dv-edward.onrender.com/api/search/youtube?apiKey=${apiKeyEdward}&query=${encodeURIComponent(query)}`
      const searchRes = await fetch(searchUrl)
      const searchData = await searchRes.json()

      if (!searchData.status || !searchData.data || searchData.data.length === 0) {
        return sock.sendMessage(chatId, { text: `❌ No se encontró ningún video con ese nombre.` })
      }
      
      url = searchData.data[0].url
    }

    await sock.sendMessage(chatId, { text: `📥 Obteniendo video, espera un momento...` }, { quoted: m })

    let videoData = null
    
    try {
      const edwardUrl = `https://dv-edward.onrender.com/api/download/ytvideo?url=${encodeURIComponent(url)}&apiKey=${apiKeyEdward}`
      const edwardRes = await fetch(edwardUrl)
      const edwardJson = await edwardRes.json()
      
      if (edwardJson.status && edwardJson.result?.download_url) {
        videoData = {
          title: edwardJson.result.title,
          thumbnail: edwardJson.result.thumbnail,
          dl: edwardJson.result.download_url
        }
      }
    } catch (e) {
      console.log('API Edward falló para video, intentando con Delirius...')
    }

    if (!videoData) {
      try {
        const deliriusUrl = `https://api.delirius.store/download/ytmp4?url=${encodeURIComponent(url)}`
        const deliriusRes = await fetch(deliriusUrl)
        const deliriusJson = await deliriusRes.json()
        
        if (deliriusJson.status && deliriusJson.data?.download?.url) {
          videoData = {
            title: deliriusJson.data.title || 'Video de YouTube',
            thumbnail: deliriusJson.data.image || deliriusJson.data.thumbnail,
            dl: deliriusJson.data.download.url
          }
        }
      } catch (e) {
        console.log('API Delirius también falló para video.')
      }
    }

    if (!videoData) {
      return sock.sendMessage(chatId, { text: `❌ Ambas APIs de descarga fallaron. Inténtalo más tarde.` })
    }

    await sock.sendMessage(chatId, {
      video: { url: videoData.dl },
      caption: `🎬 *Título:* ${videoData.title}\n✨ *Descargado con éxito*`,
      mimetype: 'video/mp4'
    }, { quoted: m })

  } catch (error) {
    console.error('Error en comando video:', error)
    await sock.sendMessage(chatId, { text: `❌ Ocurrió un error inesperado al procesar el video.` })
  }
}
