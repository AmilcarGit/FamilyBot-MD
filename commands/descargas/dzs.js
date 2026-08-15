export const desc = 'Busca canciones en Deezer y permite elegir una.'
export const alias = ['deezersearch', 'dzs']
export const cooldown = 5

export default async function dzs({ sock, chatId, args, config, m }) {
  const query = args.join(' ').trim()
  
  if (!query) {
    return sock.sendMessage(chatId, {
      text: `❌ Por favor, ingresa el nombre de una canción.\nEjemplo: *${config.prefijo}dzs Shakira*`
    })
  }

  try {
    const apiKey = 'evogb-jRhjmDSp'
    const url = `https://api.evogb.org/search/deezer?query=${encodeURIComponent(query)}&apikey=${apiKey}`
    
    await sock.sendMessage(chatId, { text: `🔍 Buscando *"${query}"* en Deezer...` }, { quoted: m })

    const response = await fetch(url)
    const data = await response.json()

    if (!data.status || !data.data || data.data.length === 0) {
      return sock.sendMessage(chatId, {
        text: `❌ No se encontraron resultados para: *${query}*`
      })
    }

    const resultados = data.data.slice(0, 10)
    
    global.dzStore = global.dzStore || {}
    global.dzStore[chatId] = resultados

    global.dzTimeouts = global.dzTimeouts || {}
    if (global.dzTimeouts[chatId]) {
      clearTimeout(global.dzTimeouts[chatId])
    }

    global.dzTimeouts[chatId] = setTimeout(() => {
      if (global.dzStore[chatId] === resultados) {
        delete global.dzStore[chatId]
        delete global.dzTimeouts[chatId]
      }
    }, 5 * 60 * 1000)

    let mensaje = `🎵 *Resultados de Deezer para:* ${query}\n\n`

    for (let i = 0; i < resultados.length; i++) {
      const res = resultados[i]
      mensaje += `*${i + 1}.* ${res.title}\n`
      mensaje += `👤 *Artista:* ${res.artist} | ⏱️ *Duración:* ${res.duration}\n\n`
    }

    mensaje += `💡 *Escribe:* \`${config.prefijo}dz <número>\` para descargar.\n\n`
    mensaje += `⏳ *Nota:* Tienes 5 minutos para elegir.`

    const primerResultado = resultados[0]
    
    await sock.sendMessage(chatId, {
      image: { url: primerResultado.image },
      caption: mensaje
    }, { quoted: m })

  } catch (error) {
    console.error('Error en comando dzs:', error)
    await sock.sendMessage(chatId, {
      text: `❌ Ocurrió un error al realizar la búsqueda en Deezer.`
    })
  }
}
