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
    if (global.ytsStore && global.ytsStore[chatId]) {
      const result = global.ytsStore[chatId][index - 1]
      if (result) {
        query = result.url
      }
    }
  }

  try {
    let url = query

    if (!query.includes('youtube.com') && !query.includes('youtu.be')) {
      await sock.sendMessage(chatId, { text: `🔍 Buscando *"${query}"*...` }, { quoted: m })
      const searchUrl = `https://dv-edward.onrender.com/api/search/youtube?apiKey=EdwardwEqIgrqU&query=${encodeURIComponent(query)}`
      const searchRes = await fetch(searchUrl)
      const searchData = await searchRes.json()
      if (searchData.status && searchData.data?.length > 0) {
        url = searchData.data[0].url
      } else {
        return sock.sendMessage(chatId, { text: `❌ No se encontró ningún video con ese nombre.` })
      }
    }

    await sock.sendMessage(chatId, { text: `📥 Obteniendo video, espera un momento...` }, { quoted: m })

    let videoData = null
    const apis = [
      {
        name: 'Delirius',
        url: `https://api.delirius.store/download/ytmp4?url=${encodeURIComponent(url)}`,
        parse: (json) => json.status && json.data?.download?.url ? { dl: json.data.download.url, title: json.data.title } : null
      },
      {
        name: 'Edward',
        url: `https://dv-edward.onrender.com/api/download/ytvideo?url=${encodeURIComponent(url)}&apiKey=EdwardwEqIgrqU`,
        parse: (json) => json.status && json.result?.download_url ? { dl: json.result.download_url, title: json.result.title } : null
      },
      {
        name: 'Vkrdown',
        url: `https://api.vkrdown.com/api/ytmp4?url=${encodeURIComponent(url)}`,
        parse: (json) => json.status && json.data?.url ? { dl: json.data.url, title: json.data.title } : null
      }
    ]

    for (const api of apis) {
      try {
        const res = await fetch(api.url)
        const json = await res.json()
        const parsed = api.parse(json)
        if (parsed) {
          videoData = parsed
          break
        }
      } catch (e) {
        console.log(`Error en API ${api.name}:`, e.message)
      }
    }

    if (!videoData) {
      return sock.sendMessage(chatId, { text: `❌ No se pudo obtener el video de ninguna fuente. Inténtalo más tarde.` })
    }

    const fileRes = await fetch(videoData.dl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    
    if (!fileRes.ok) throw new Error('Fallo al descargar el archivo de video')
    
    const buffer = Buffer.from(await fileRes.arrayBuffer())
    
    if (buffer.length < 1000) throw new Error('Archivo de video corrupto o demasiado pequeño')

    await sock.sendMessage(chatId, {
      video: buffer,
      caption: `🎬 *Título:* ${videoData.title}\n✨ *Descargado con éxito*`,
      mimetype: 'video/mp4',
      fileName: `${videoData.title}.mp4`
    }, { quoted: m })

  } catch (error) {
    console.error('Error en comando video:', error)
    await sock.sendMessage(chatId, { text: `❌ Ocurrió un error al procesar el video: ${error.message}` })
  }
}
