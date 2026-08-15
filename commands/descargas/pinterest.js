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

    const apiUrl = `https://api.delirius.store/search/pinterestv2?text=${encodeURIComponent(query)}`
    const res = await fetch(apiUrl)
    const data = await res.json()

    if (!data.status || !data.data || data.data.length === 0) {
      return sock.sendMessage(chatId, { text: `❌ No se encontraron resultados para *"${query}"*.` })
    }

    const results = data.data.slice(0, 5)
    
    for (const item of results) {
      await sock.sendMessage(chatId, {
        image: { url: item.image },
        caption: `📌 *Pinterest:* ${query}`
      }, { quoted: msg })
    }

  } catch (error) {
    console.error('Error en comando pinterest:', error)
    await sock.sendMessage(chatId, { text: `❌ Ocurrió un error al buscar en Pinterest.` })
  }
}
