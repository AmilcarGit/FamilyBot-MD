export const alias = ['musica', 'audio']
export const cooldown = 10

export default async function play({ sock, chatId, args, m, config }) {
  let query = args.join(' ').trim()
  
  if (!query) {
    return sock.sendMessage(chatId, {
      text: `❌ Por favor, ingresa el nombre de una canción, un link o el número del buscador.\nEjemplo: *${config.prefijo}play 1*`
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
      const searchUrl = `https://dv-edward.onrender.com/api/search/youtube?apiKey=EdwardNDffYyRz&query=${encodeURIComponent(query)}`
      const searchRes = await fetch(searchUrl)
      const searchData = await searchRes.json()
      if (searchData.status && searchData.data?.length > 0) {
        url = searchData.data[0].url
      } else {
        return sock.sendMessage(chatId, { text: `❌ No se encontró ninguna canción con ese nombre.` })
      }
    }

    await sock.sendMessage(chatId, { text: `📥 Obteniendo audio, espera un momento...` }, { quoted: m })

    const apiKey = 'lem954'
    const apiUrl = `https://api.lempi.lat/dl/yta?url=${encodeURIComponent(url)}&apikey=${apiKey}`
    
    const res = await fetch(apiUrl)
    const data = await res.json()

    if (!data.status || !data.datos?.url) {
      return sock.sendMessage(chatId, { text: `❌ No se pudo obtener el audio. La API podría estar saturada.` })
    }

    const { titulo, datos } = data

    const fileRes = await fetch(datos.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    
    if (!fileRes.ok) throw new Error('Fallo al descargar el archivo de audio')
    const buffer = Buffer.from(await fileRes.arrayBuffer())

    await sock.sendMessage(chatId, {
      audio: buffer,
      mimetype: 'audio/mpeg',
      fileName: `${titulo}.mp3`
    }, { quoted: m })

  } catch (error) {
    console.error('Error en comando play:', error)
    await sock.sendMessage(chatId, { text: `❌ Ocurrió un error al procesar el audio.` })
  }
}
