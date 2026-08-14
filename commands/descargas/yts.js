export const desc = 'Busca videos en YouTube.'
export const alias = ['ytsearch', 'yts']
export const cooldown = 5

export default async function yts({ sock, chatId, args, config }) {
  const query = args.join(' ').trim()
  
  if (!query) {
    return sock.sendMessage(chatId, {
      text: `❌ Por favor, ingresa un término de búsqueda.\nEjemplo: *${config.prefijo}yts Minecraft*`
    })
  }

  try {
    const apiKey = 'EdwardwEqIgrqU'
    const url = `https://dv-edward.onrender.com/api/search/youtube?apiKey=${apiKey}&query=${encodeURIComponent(query)}`
    
    const response = await fetch(url)
    const data = await response.json()

    if (!data.status || !data.data || data.data.length === 0) {
      return sock.sendMessage(chatId, {
        text: `❌ No se encontraron resultados para: *${query}*`
      })
    }

    const resultados = data.data.slice(0, 10)
    let mensaje = `📺 *Resultados de YouTube para:* ${query}\n\n`

    for (let i = 0; i < resultados.length; i++) {
      const res = resultados[i]
      mensaje += `*${i + 1}.* ${res.title}\n`
      mensaje += `⏱️ *Duración:* ${res.duration}\n`
      mensaje += `👁️ *Vistas:* ${res.views}\n`
      mensaje += `👤 *Canal:* ${res.author}\n`
      mensaje += `🔗 *Link:* ${res.url}\n\n`
    }

    const primerResultado = resultados[0]
    
    await sock.sendMessage(chatId, {
      image: { url: primerResultado.thumbnail },
      caption: mensaje
    })

  } catch (error) {
    console.error('Error en comando yts:', error)
    await sock.sendMessage(chatId, {
      text: `❌ Ocurrió un error al realizar la búsqueda. Inténtalo más tarde.`
    })
  }
}
