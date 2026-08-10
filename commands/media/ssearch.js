export const desc = 'Busca paquetes de stickers y envía algunos.'
export const alias = ['buscars', 'stickersearch', 'ss']
export const cooldown = 10

export default async function ssearch({ sock, chatId, args, config }) {
  const query = args.join(' ').trim()
  
  if (!query) {
    return sock.sendMessage(chatId, {
      text: `❌ Por favor, ingresa un término de búsqueda.\nEjemplo: *${config.prefijo}ss gatos*`
    })
  }

  try {
    const apiKey = 'lem711'
    const url = `https://api.lempi.lat/s/stickers?q=${encodeURIComponent(query)}&apikey=${apiKey}`
    
    await sock.sendMessage(chatId, { text: `🔎 Buscando stickers de *${query}*...` })

    const response = await fetch(url)
    const data = await response.json()

    const resultados = Array.isArray(data) ? data : (data.resultados || [])

    if (resultados.length === 0) {
      return sock.sendMessage(chatId, {
        text: `❌ No se encontraron paquetes de stickers para: *${query}*`
      })
    }

    const pack = resultados[0]
    const stickers = pack.stickers || []

    if (stickers.length === 0) {
      return sock.sendMessage(chatId, {
        text: `❌ El paquete encontrado no tiene stickers disponibles.`
      })
    }

    let info = `✨ *Paquete:* ${pack.titulo}\n`
    info += `👤 *Autor:* ${pack.autor || 'Desconocido'}\n`
    info += `📦 *Total:* ${stickers.length} stickers\n\n`
    info += `📥 Enviando los primeros 3 stickers...`

    await sock.sendMessage(chatId, { text: info })

    const aEnviar = stickers.slice(0, 3)
    
    for (const sUrl of aEnviar) {
      await sock.sendMessage(chatId, { 
        sticker: { url: sUrl } 
      })
    }

  } catch (error) {
    console.error('Error en comando ssearch:', error)
    await sock.sendMessage(chatId, {
      text: `❌ Ocurrió un error al buscar stickers. Inténtalo más tarde.`
    })
  }
}
