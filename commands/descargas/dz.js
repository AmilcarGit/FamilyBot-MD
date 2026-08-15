export const desc = 'Descarga canciones de Deezer usando un link o el número del buscador.'
export const alias = ['deezer', 'dldz']
export const cooldown = 10

export default async function dz({ sock, chatId, args, m, config }) {
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
    await sock.sendMessage(chatId, { text: `🔍 Buscando enlace para *"${input}"*...` }, { quoted: m })
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
    await sock.sendMessage(chatId, { text: `📥 Obteniendo audio de Deezer, espera un momento...` }, { quoted: m })

    let audioData = null
    const apis = [
      {
        name: 'Delirius',
        url: `https://api.delirius.store/download/deezer?url=${encodeURIComponent(deezerUrl)}`,
        parse: (json) => json.status && json.data?.download?.url ? { dl: json.data.download.url, title: json.data.title, artist: json.data.artist, cover: json.data.image } : null
      },
      {
        name: 'EvoGB',
        url: `https://api.evogb.org/dl/deezer?url=${encodeURIComponent(deezerUrl)}&key=evogb-jRhjmDSp`,
        parse: (json) => json.status && json.data?.dl ? { dl: json.data.dl, title: json.data.title, artist: json.data.artist, cover: json.data.cover } : null
      }
    ]

    for (const api of apis) {
      try {
        const res = await fetch(api.url)
        const json = await res.json()
        const parsed = api.parse(json)
        if (parsed) {
          audioData = parsed
          break
        }
      } catch (e) {
        console.log(`Error en API Deezer ${api.name}:`, e.message)
      }
    }

    if (!audioData) {
      return sock.sendMessage(chatId, { text: `❌ No se pudo obtener el audio de Deezer. La API podría estar caída o el enlace es inválido.` })
    }

    const fileRes = await fetch(audioData.dl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    
    if (!fileRes.ok) throw new Error('Fallo al descargar el archivo de audio')
    const buffer = Buffer.from(await fileRes.arrayBuffer())

    if (buffer.length < 10000) {
      throw new Error('El archivo es demasiado pequeño (posiblemente solo un preview de 30s)')
    }

    await sock.sendMessage(chatId, {
      image: { url: audioData.cover || 'https://i.ibb.co/G7k4v4z/deezer.png' },
      caption: `🎵 *Título:* ${audioData.title}\n👤 *Artista:* ${audioData.artist}\n✅ *Enviando audio...*`
    }, { quoted: m })

    await sock.sendMessage(chatId, {
      audio: buffer,
      mimetype: 'audio/mpeg',
      fileName: `${audioData.title}.mp3`
    }, { quoted: m })

  } catch (error) {
    console.error('Error en comando dz:', error)
    await sock.sendMessage(chatId, { text: `❌ Ocurrió un error: ${error.message}` })
  }
}
