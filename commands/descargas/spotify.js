export const desc = 'Busca y descarga música de Spotify en un solo comando.'
export const alias = ['sp', 'spd', 'spotifydl']
export const cooldown = 5

export default async function spotify({ sock, chatId, args, config, msg }) {
  const query = args.join(' ').trim()

  if (!query) {
    return sock.sendMessage(chatId, {
      text: `❌ *Uso del comando Spotify:*\n\n` +
            `🔹 *Buscar:* \`${config.prefijo}sp canción\`\n` +
            `🔹 *Descargar:* \`${config.prefijo}sp número\` (después de buscar)\n` +
            `🔹 *Link:* \`${config.prefijo}sp link_de_spotify\``
    })
  }

  const index = parseInt(query)
  if (!isNaN(index) && index > 0 && index <= 10 && global.spotifyStore && global.spotifyStore[chatId]) {
    const selected = global.spotifyStore[chatId][index - 1]
    if (selected) return descargarCancion(selected.url, sock, chatId, msg)
  }

  if (query.includes('spotify.com/track/')) {
    return descargarCancion(query, sock, chatId, msg)
  }

  try {
    const apiKey = 'lem954'
    const url = `https://api.lempi.lat/s/sp?q=${encodeURIComponent(query)}&limit=10&apikey=${apiKey}`

    await sock.sendMessage(chatId, { text: `🎵 Buscando *"${query}"* en Spotify...` }, { quoted: msg })

    const response = await fetch(url)
    const data = await response.json()

    if (!data.status || !data.resultado || !data.resultado.canciones || data.resultado.canciones.length === 0) {
      return sock.sendMessage(chatId, { text: `❌ No se encontraron resultados para: *${query}*` })
    }

    const canciones = data.resultado.canciones.slice(0, 10)
    global.spotifyStore = global.spotifyStore || {}
    global.spotifyStore[chatId] = canciones

    global.spotifyTimeouts = global.spotifyTimeouts || {}
    if (global.spotifyTimeouts[chatId]) clearTimeout(global.spotifyTimeouts[chatId])
    global.spotifyTimeouts[chatId] = setTimeout(() => {
      delete global.spotifyStore[chatId]
    }, 5 * 60 * 1000)

    let mensaje = `🌌 *THE YUI-MD: SPOTIFY SYSTEM* 🌌\n\n`
    canciones.forEach((c, i) => {
      const art = c.artistas.map(a => a.nombre).join(', ')
      mensaje += `*${i + 1}.* ${c.nombre}\n   👤 ${art}\n   ⏱️ ${c.duracion}\n\n`
    })

    mensaje += `💡 *Responde con el número* para descargar el audio.\n`
    mensaje += `⏳ *Nota:* La lista expira en 5 minutos.`

    const imagen = canciones[0].imagen || 'https://api.lempi.lat/spotify-banner.jpg'

    await sock.sendMessage(chatId, {
      image: { url: imagen },
      caption: mensaje
    }, { quoted: msg })

  } catch (error) {
    console.error('Error en búsqueda Spotify:', error)
    await sock.sendMessage(chatId, { text: `❌ Error en la conexión neural con Spotify.` })
  }
}

async function descargarCancion(url, sock, chatId, msg) {
  try {
    await sock.sendMessage(chatId, { text: `📥 Procesando descarga de Spotify...` }, { quoted: msg })

    const apiKey = 'lem954'
    const dlUrl = `https://api.lempi.lat/dl/spotify?url=${encodeURIComponent(url)}&apikey=${apiKey}`

    const response = await fetch(dlUrl)
    const data = await response.json()

    if (!data.status || !data.datos || !data.datos.url) {
      return sock.sendMessage(chatId, { text: `❌ No se pudo obtener el audio. Reintenta más tarde.` })
    }

    const { titulo, artista, datos } = data
    const fileRes = await fetch(datos.url)
    const buffer = Buffer.from(await fileRes.arrayBuffer())

    await sock.sendMessage(chatId, {
      audio: buffer,
      mimetype: 'audio/mpeg',
      fileName: `${titulo} - ${artista}.mp3`
    }, { quoted: msg })

  } catch (error) {
    console.error('Error en descarga Spotify:', error)
    await sock.sendMessage(chatId, { text: `❌ Error al procesar la descarga.` })
  }
}
