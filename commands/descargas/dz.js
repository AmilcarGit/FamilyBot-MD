export const desc = 'Descarga canciones de Deezer (Full Song) usando un link o el número del buscador.'
export const alias = ['deezer', 'dldz']
export const cooldown = 10

export default async function dz({ sock, chatId, args, msg, config }) {
  let input = args.join(' ').trim()
  
  if (!input) {
    return sock.sendMessage(chatId, {
      text: `❌ Por favor, ingresa el número del buscador o un link de Deezer.\nEjemplo: *${config.prefijo}dz 1* o *${config.prefijo}dz https://www.deezer.com/track/...*`
    })
  }

  let deezerUrl = ''
  const index = parseInt(input)

  if (!isNaN(index) && index > 0 && index <= 10) {
    if (global.dzStore && global.dzStore[chatId]) {
      const selected = global.dzStore[chatId][index - 1]
      if (selected && (selected.url || selected.link)) {
        deezerUrl = selected.url || selected.link
      } else {
        return sock.sendMessage(chatId, { text: `❌ No encontré el enlace para el número *${index}*. Intenta buscar de nuevo con *${config.prefijo}dzs*.` })
      }
    } else {
      return sock.sendMessage(chatId, { text: `❌ No hay una búsqueda activa. Primero usa *${config.prefijo}dzs <nombre>*` })
    }
  } else if (input.includes('deezer.com')) {
    deezerUrl = input
  } else {
    await sock.sendMessage(chatId, { text: `🔍 Buscando enlace para *"${input}"*...` }, { quoted: msg })
    try {
      const searchRes = await fetch(`https://api.evogb.org/search/deezer?query=${encodeURIComponent(input)}&apikey=evogb-jRhjmDSp`)
      const searchData = await searchRes.json()
      if (searchData.status && searchData.data?.length > 0) {
        deezerUrl = searchData.data[0].url || searchData.data[0].link
      }
    } catch (e) {}
  }

  if (!deezerUrl) {
    return sock.sendMessage(chatId, { text: `❌ No se pudo obtener un enlace de Deezer válido.` })
  }

  try {
    await sock.sendMessage(chatId, { text: `📥 Obteniendo información de Deezer...` }, { quoted: msg })

    const infoRes = await fetch(`https://api.evogb.org/dl/deezer?url=${encodeURIComponent(deezerUrl)}&key=evogb-jRhjmDSp`)
    const infoData = await infoRes.json()

    if (!infoData.status || !infoData.data) {
      return sock.sendMessage(chatId, { text: `❌ No se pudo obtener información de esta canción.` })
    }

    const { title, artist, cover } = infoData.data
    const searchQuery = `${title} ${artist}`

    await sock.sendMessage(chatId, { 
      image: { url: cover || 'https://i.ibb.co/G7k4v4z/deezer.png' },
      caption: `🎵 *Título:* ${title}\n👤 *Artista:* ${artist}\n\n🚀 *Descargando versión completa (Full Song)...*`
    }, { quoted: msg })

    let audioBuffer = null
    let success = false

    const ytSearchUrl = `https://dv-edward.onrender.com/api/search/youtube?apiKey=EdwardwEqIgrqU&query=${encodeURIComponent(searchQuery)}`
    const ytSearchRes = await fetch(ytSearchUrl)
    const ytSearchData = await ytSearchRes.json()

    if (ytSearchData.status && ytSearchData.data?.length > 0) {
      const ytUrl = ytSearchData.data[0].url
      
      const dlApis = [
        `https://api.delirius.store/download/ytmp3?url=${encodeURIComponent(ytUrl)}`,
        `https://dv-edward.onrender.com/api/download/ytaudio?url=${encodeURIComponent(ytUrl)}&apiKey=EdwardwEqIgrqU`
      ]

      for (const api of dlApis) {
        try {
          const res = await fetch(api)
          const json = await res.json()
          const dlUrl = json.data?.download?.url || json.result?.download_url
          
          if (dlUrl) {
            const fileRes = await fetch(dlUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
            if (fileRes.ok) {
              audioBuffer = Buffer.from(await fileRes.arrayBuffer())
              if (audioBuffer.length > 50000) {
                success = true
                break
              }
            }
          }
        } catch (e) {
          console.log('Error en fallback API:', e.message)
        }
      }
    }

    if (!success) {
      try {
        const directRes = await fetch(infoData.data.dl)
        if (directRes.ok) {
          audioBuffer = Buffer.from(await directRes.arrayBuffer())
          success = true
        }
      } catch (e) {}
    }

    if (!success || !audioBuffer) {
      return sock.sendMessage(chatId, { text: `❌ No se pudo descargar la canción completa. Inténtalo más tarde.` })
    }

    await sock.sendMessage(chatId, {
      audio: audioBuffer,
      mimetype: 'audio/mpeg',
      fileName: `${title}.mp3`
    }, { quoted: msg })

  } catch (error) {
    console.error('Error en comando dz:', error)
    await sock.sendMessage(chatId, { text: `❌ Ocurrió un error al procesar la descarga.` })
  }
}
