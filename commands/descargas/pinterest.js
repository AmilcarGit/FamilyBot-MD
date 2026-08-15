export const desc = 'Busca y descarga imágenes de Pinterest.'
export const alias = ['pin', 'pint']
export const cooldown = 10

export default async function pinterest({ sock, chatId, args, msg, config }) {
  const query = args.join(' ').trim()
  
  if (!query) {
    return sock.sendMessage(chatId, {
      text: `❌ Por favor, ingresa lo que deseas buscar en Pinterest.\nEjemplo: *${config.prefijo}pinterest anime*`
    })
  }

  try {
    await sock.sendMessage(chatId, { text: `🔍 Buscando imágenes de *"${query}"* en Pinterest...` }, { quoted: msg })

    const apiKey = 'lem954'
    const apiUrl = `https://api.lempi.lat/s/pin?q=${encodeURIComponent(query)}&limit=5&apikey=${apiKey}`
    const res = await fetch(apiUrl)
    const data = await res.json()

    if (!data.status || !data.results || data.results.length === 0) {
      return sock.sendMessage(chatId, { text: `❌ No se encontraron resultados para *"${query}"*.` })
    }

    const results = data.results.slice(0, 5)
    
    for (const item of results) {
      await sock.sendMessage(chatId, {
        image: { url: item.descarga },
        caption: `📌 *Autor:* ${item.autor || 'Desconocido'}\n🔗 *Pin:* ${item.url}`
      }, { quoted: msg })
    }

  } catch (error) {
    console.error('Error en comando pinterest:', error)
    await sock.sendMessage(chatId, { text: `❌ Ocurrió un error al buscar en Pinterest.` })
  }
}
