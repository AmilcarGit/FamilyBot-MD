export const desc = 'Descarga canciones de Deezer.'
export const alias = ['deezer', 'dldz']
export const cooldown = 10

export default async function dz({ sock, chatId, args, m, config }) {
  let query = args.join(' ').trim()
  
  if (!query) {
    return sock.sendMessage(chatId, {
      text: `❌ Por favor, ingresa el nombre de una canción, un link de Deezer o el número del buscador.\nEjemplo: *${config.prefijo}dz 1*`
    })
  }

  const index = parseInt(query)
  if (!isNaN(index) && index > 0 && index <= 10) {
    if (global.dzStore && global.dzStore[chatId]) {
      const result = global.dzStore[chatId][index - 1]
      if (result) {
        query = result.url
      }
    }
  }

  try {
    const apiKey = 'evogb-jRhjmDSp'
    let url = query

    if (!query.includes('deezer.com')) {
      await sock.sendMessage(chatId, { text: `🔍 Buscando *"${query}"* para descargar...` }, { quoted: m })
      const searchUrl = `https://api.evogb.org/search/deezer?query=${encodeURIComponent(query)}&apikey=${apiKey}`
      const searchRes = await fetch(searchUrl)
      const searchData = await searchRes.json()
      if (searchData.status && searchData.data?.length > 0) {
        url = searchData.data[0].url
      } else {
        return sock.sendMessage(chatId, { text: `❌ No se encontró la canción en Deezer.` })
      }
    }

    await sock.sendMessage(chatId, { text: `📥 Descargando audio de Deezer, espera un momento...` }, { quoted: m })

    const dlUrl = `https://api.evogb.org/dl/deezer?url=${encodeURIComponent(url)}&key=${apiKey}`
    const dlRes = await fetch(dlUrl)
    const dlData = await dlRes.json()

    if (!dlData.status || !dlData.data?.url) {
      return sock.sendMessage(chatId, { text: `❌ Error al obtener el audio de Deezer.` })
    }

    const { title, artist, image, url: downloadUrl } = dlData.data

    const fileRes = await fetch(downloadUrl)
    const buffer = Buffer.from(await fileRes.arrayBuffer())

    await sock.sendMessage(chatId, {
      image: { url: image },
      caption: `🎵 *Título:* ${title}\n👤 *Artista:* ${artist}\n📥 *Enviando audio...*`
    }, { quoted: m })

    await sock.sendMessage(chatId, {
      audio: buffer,
      mimetype: 'audio/mpeg',
      fileName: `${title}.mp3`
    }, { quoted: m })

  } catch (error) {
    console.error('Error en comando dz:', error)
    await sock.sendMessage(chatId, { text: `❌ Ocurrió un error al procesar la descarga de Deezer.` })
  }
}
