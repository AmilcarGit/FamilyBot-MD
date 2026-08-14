export const desc = 'Busca y descarga el audio de un video de YouTube.'
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
    const apiKeyEdward = 'EdwardwEqIgrqU'
    let url = query

    if (!query.includes('youtube.com') && !query.includes('youtu.be')) {
      await sock.sendMessage(chatId, { text: `🔍 Buscando *"${query}"*...` }, { quoted: m })
      
      const searchUrl = `https://dv-edward.onrender.com/api/search/youtube?apiKey=${apiKeyEdward}&query=${encodeURIComponent(query)}`
      const searchRes = await fetch(searchUrl)
      const searchData = await searchRes.json()

      if (!searchData.status || !searchData.data || searchData.data.length === 0) {
        return sock.sendMessage(chatId, { text: `❌ No se encontró ninguna canción con ese nombre.` })
      }
      
      url = searchData.data[0].url
    }

    await sock.sendMessage(chatId, { text: `📥 Obteniendo audio, espera un momento...` }, { quoted: m })

    let audioData = null
    
    try {
      const edwardUrl = `https://dv-edward.onrender.com/api/download/ytaudio?url=${encodeURIComponent(url)}&apiKey=${apiKeyEdward}`
      const edwardRes = await fetch(edwardUrl)
      const edwardJson = await edwardRes.json()
      
      if (edwardJson.status && edwardJson.result?.download_url) {
        audioData = {
          title: edwardJson.result.title,
          thumbnail: edwardJson.result.thumbnail,
          dl: edwardJson.result.download_url
        }
      }
    } catch (e) {
      console.log('API Edward falló, intentando con Delirius...')
    }

    if (!audioData) {
      try {
        const deliriusUrl = `https://api.delirius.store/download/ytmp3?url=${encodeURIComponent(url)}`
        const deliriusRes = await fetch(deliriusUrl)
        const deliriusJson = await deliriusRes.json()
        
        if (deliriusJson.status && deliriusJson.data?.download?.url) {
          audioData = {
            title: deliriusJson.data.title || 'Audio de YouTube',
            thumbnail: deliriusJson.data.image || deliriusJson.data.thumbnail,
            dl: deliriusJson.data.download.url
          }
        }
      } catch (e) {
        console.log('API Delirius también falló.')
      }
    }

    if (!audioData) {
      return sock.sendMessage(chatId, { text: `❌ Ambas APIs de descarga fallaron. Inténtalo más tarde.` })
    }

    const res = await fetch(audioData.dl)
    const buffer = Buffer.from(await res.arrayBuffer())

    await sock.sendMessage(chatId, {
      image: { url: audioData.thumbnail },
      caption: `🎵 *Título:* ${audioData.title}\n📥 *Enviando audio...*`
    }, { quoted: m })

    await sock.sendMessage(chatId, {
      audio: buffer,
      mimetype: 'audio/mpeg',
      fileName: `${audioData.title}.mp3`
    }, { quoted: m })

  } catch (error) {
    console.error('Error en comando play:', error)
    await sock.sendMessage(chatId, { text: `❌ Ocurrió un error inesperado al procesar tu solicitud.` })
  }
}
