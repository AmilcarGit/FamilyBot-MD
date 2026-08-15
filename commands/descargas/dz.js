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
      if (selected && selected.url) {
        deezerUrl = selected.url
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
        deezerUrl = searchData.data[0].url
      }
    } catch (e) {}
  }

  if (!deezerUrl) {
    return sock.sendMessage(chatId, { text: `❌ No se pudo obtener un enlace de Deezer válido. Por favor, pega el link directamente.` })
  }

  try {
    await sock.sendMessage(chatId, { text: `📥 Preparando descarga de Deezer...` }, { quoted: m })

    const apiKey = 'evogb-jRhjmDSp'
    const dlApiUrl = `https://api.evogb.org/dl/deezer?url=${encodeURIComponent(deezerUrl)}&key=${apiKey}`
    
    const dlRes = await fetch(dlApiUrl)
    const dlData = await dlRes.json()

    if (!dlData.status || !dlData.data?.url) {
      return sock.sendMessage(chatId, { text: `❌ La API de Deezer no pudo procesar este enlace. Intenta con otra canción.` })
    }

    const { title, artist, image, url: downloadUrl } = dlData.data

    const fileRes = await fetch(downloadUrl)
    if (!fileRes.ok) throw new Error('Error al descargar el archivo')
    const buffer = Buffer.from(await fileRes.arrayBuffer())

    const cleanTitle = title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase()
      .substring(0, 30)

    await sock.sendMessage(chatId, {
      image: { url: image },
      caption: `🎵 *Título:* ${title}\n👤 *Artista:* ${artist}\n✅ *Enviando audio...*`
    }, { quoted: m })

    await sock.sendMessage(chatId, {
      document: buffer,
      fileName: `${cleanTitle}.mp3`,
      mimetype: 'application/octet-stream'
    }, { quoted: m })

  } catch (error) {
    console.error('Error en comando dz:', error)
    await sock.sendMessage(chatId, { text: `❌ Ocurrió un error al procesar la descarga de Deezer.` })
  }
}
