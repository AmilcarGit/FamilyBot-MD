// Usando fetch nativo (Node.js 18+)

export const desc = 'Busca videos en Xvideos.'
export const alias = ['xv', 'xvideo']
export const cooldown = 5

export default async function xvideos({ sock, chatId, args, config }) {
  const query = args.join(' ')
  
  if (!query) {
    return sock.sendMessage(chatId, {
      text: `❌ Por favor, ingresa un término de búsqueda.\nEjemplo: *${config.prefijo}xvideos latinas*`
    })
  }

  try {
    const apiKey = 'evogb-jRhjmDSp'
    const url = `https://api.evogb.org/nsfw/search/xvideos?query=${encodeURIComponent(query)}&apikey=${apiKey}`
    
    const response = await fetch(url)
    const data = await response.json()

    if (!data.status || !data.resultados || data.resultados.length === 0) {
      return sock.sendMessage(chatId, {
        text: `❌ No se encontraron resultados para: *${query}*`
      })
    }

    const resultados = data.resultados.slice(0, 5) // Mostrar los primeros 5
    let mensaje = `🔞 *Resultados de Xvideos para:* ${query}\n\n`

    for (const res of resultados) {
      mensaje += `🎬 *Título:* ${res.title}\n`
      mensaje += `⏱️ *Duración:* ${res.duration}\n`
      mensaje += `👤 *Artista:* ${res.artist || 'Desconocido'}\n`
      mensaje += `🔗 *Link:* ${res.url}\n\n`
    }

    // Enviamos el primer resultado con imagen si está disponible
    const primerResultado = resultados[0]
    if (primerResultado.cover) {
      await sock.sendMessage(chatId, {
        image: { url: primerResultado.cover },
        caption: mensaje
      })
    } else {
      await sock.sendMessage(chatId, { text: mensaje })
    }

  } catch (error) {
    console.error('Error en comando xvideos:', error)
    await sock.sendMessage(chatId, {
      text: `❌ Ocurrió un error al realizar la búsqueda. Inténtalo más tarde.`
    })
  }
}
