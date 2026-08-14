import { saveResults } from '../../lib/tempStore.js'

export const desc = 'Busca videos en YouTube y permite elegir uno.'
export const alias = ['ytsearch', 'yts']
export const cooldown = 5

export default async function yts({ sock, chatId, args, config, m }) {
  const query = args.join(' ').trim()
  
  if (!query) {
    return sock.sendMessage(chatId, {
      text: `❌ Por favor, ingresa un término de búsqueda.\nEjemplo: *${config.prefijo}yts Minecraft*`
    })
  }

  try {
    const apiKey = 'EdwardwEqIgrqU'
    const url = `https://dv-edward.onrender.com/api/search/youtube?apiKey=${apiKey}&query=${encodeURIComponent(query)}`
    
    await sock.sendMessage(chatId, { text: `🔍 Buscando *"${query}"* en YouTube...` }, { quoted: m })

    const response = await fetch(url)
    const data = await response.json()

    if (!data.status || !data.data || data.data.length === 0) {
      return sock.sendMessage(chatId, {
        text: `❌ No se encontraron resultados para: *${query}*`
      })
    }

    const resultados = data.data.slice(0, 10)
    saveResults(chatId, resultados)

    let mensaje = `📺 *Resultados para:* ${query}\n\n`

    for (let i = 0; i < resultados.length; i++) {
      const res = resultados[i]
      mensaje += `*${i + 1}.* ${res.title}\n`
      mensaje += `⏱️ *Duración:* ${res.duration} | 👤 *Canal:* ${res.author}\n\n`
    }

    mensaje += `💡 *Escribe:* \`${config.prefijo}play <número>\` para audio.\n`
    mensaje += `💡 *Escribe:* \`${config.prefijo}video <número>\` para video.`

    const primerResultado = resultados[0]
    
    await sock.sendMessage(chatId, {
      image: { url: primerResultado.thumbnail },
      caption: mensaje
    }, { quoted: m })

  } catch (error) {
    console.error('Error en comando yts:', error)
    await sock.sendMessage(chatId, {
      text: `❌ Ocurrió un error al realizar la búsqueda.`
    })
  }
}
