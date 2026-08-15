export const desc = 'Busca canciones en Spotify y permite elegir una para descargar.'
export const alias = ['sp', 'spotifysearch']
export const cooldown = 5

export default async function spotify({ sock, chatId, args, config, msg }) {
  const query = args.join(' ').trim()

  if (!query) {
    return sock.sendMessage(chatId, {
      text: `❌ Por favor, ingresa el nombre de una canción o artista.\nEjemplo: *${config.prefijo}sp Bad Bunny*`
    })
  }

  try {
    const apiKey = 'lem954'
    const url = `https://api.lempi.lat/s/sp?q=${encodeURIComponent(query)}&limit=10&apikey=${apiKey}`

    await sock.sendMessage(chatId, { text: `🎵 Buscando *"${query}"* en Spotify...` }, { quoted: msg })

    const response = await fetch(url)
    const data = await response.json()

    if (!data.status || !data.resultado || !data.resultado.canciones || data.resultado.canciones.length === 0) {
      return sock.sendMessage(chatId, {
        text: `❌ No se encontraron canciones para: *${query}*`
      })
    }

    const canciones = data.resultado.canciones.slice(0, 10)
    
    global.spotifyStore = global.spotifyStore || {}
    global.spotifyStore[chatId] = canciones

    global.spotifyTimeouts = global.spotifyTimeouts || {}
    if (global.spotifyTimeouts[chatId]) {
      clearTimeout(global.spotifyTimeouts[chatId])
    }

    global.spotifyTimeouts[chatId] = setTimeout(() => {
      if (global.spotifyStore[chatId] === canciones) {
        delete global.spotifyStore[chatId]
        delete global.spotifyTimeouts[chatId]
      }
    }, 5 * 60 * 1000)

    let mensaje = `🌌 *THE YUI-MD: SPOTIFY SEARCH* 🌌\n\n`
    mensaje += `🔎 *Resultados para:* ${query}\n\n`

    canciones.forEach((c, i) => {
      const art = c.artistas.map(a => a.nombre).join(', ')
      mensaje += `*${i + 1}.* ${c.nombre}\n   👤 ${art}\n   ⏱️ ${c.duracion}\n\n`
    })

    mensaje += `💡 *Escribe:* \`${config.prefijo}spd <número>\` para descargar el audio.\n`
    mensaje += `⏳ *Nota:* La lista expira en 5 minutos.`

    const imagen = canciones[0].imagen || 'https://api.lempi.lat/spotify-banner.jpg'

    await sock.sendMessage(chatId, {
      image: { url: imagen },
      caption: mensaje
    }, { quoted: msg })

  } catch (error) {
    console.error('Error en comando spotify:', error)
    await sock.sendMessage(chatId, {
      text: `❌ Ocurrió un error en la conexión neural con Spotify.`
    })
  }
}
