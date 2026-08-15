export const desc = 'Busca y descarga el video de YouTube (Enviado como documento seguro).'
export const alias = ['vid', 'v', 'ytvideo']
export const cooldown = 15

export default async function video({ sock, chatId, args, msg, config }) {
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
      await sock.sendMessage(chatId, { text: `🔍 Buscando *"${query}"*...` }, { quoted: msg })
      const searchUrl = `https://dv-edward.onrender.com/api/search/youtube?apiKey=EdwardwEqIgrqU&query=${encodeURIComponent(query)}`
      const searchRes = await fetch(searchUrl)
      const searchData = await searchRes.json()
      if (searchData.status && searchData.data?.length > 0) {
        url = searchData.data[0].url
      } else {
        return sock.sendMessage(chatId, { text: `❌ No se encontró ningún video con ese nombre.` })
      }
    }

    await sock.sendMessage(chatId, { text: `📥 Preparando descarga segura del video...` }, { quoted: msg })

    const apiKey = 'lem954'
    const apiUrl = `https://api.lempi.lat/dl/ytv?url=${encodeURIComponent(url)}&apikey=${apiKey}`
    
    const res = await fetch(apiUrl)
    const data = await res.json()

    if (!data.status || !data.datos?.url) {
      return sock.sendMessage(chatId, { text: `❌ No se pudo procesar la descarga. La API podría estar saturada.` })
    }

    const { titulo, canal, duracion, datos } = data
    
    const cleanName = titulo
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase()
      .substring(0, 30)

    await sock.sendMessage(chatId, {
      document: { url: datos.url },
      fileName: `${cleanName}.mp4`,
      mimetype: 'video/mp4',
      caption: `🎬 *Título:* ${titulo}\n👤 *Canal:* ${canal}\n⏱️ *Duración:* ${duracion}\n⚖️ *Tamaño:* ${datos.tamaño}\n✅ *Enviado como documento para evitar errores de WhatsApp.*`
    }, { quoted: msg })

  } catch (error) {
    console.error('Error en comando video:', error)
    await sock.sendMessage(chatId, { text: `❌ Ocurrió un error al procesar el video.` })
  }
}
