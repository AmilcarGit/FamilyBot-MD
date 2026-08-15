export const desc = 'Busca la letra de una canción.'
export const alias = ['letras', 'l']
export const cooldown = 5

export default async function lyrics({ sock, chatId, args, msg, config }) {
  const query = args.join(' ').trim()
  
  if (!query) {
    return sock.sendMessage(chatId, {
      text: `❌ Por favor, ingresa el nombre de la canción.\nEjemplo: *${config.prefijo}lyrics Sech Si te vas*`
    })
  }

  try {
    await sock.sendMessage(chatId, { text: `🔍 Buscando la letra de *"${query}"*...` }, { quoted: msg })

    const apiKey = 'sk-c8498d1dfbff805b5c10823a491082714dd76ac6f9a9e03dfe12ffc9b646d9a4'
    const apiUrl = `https://api.mitzuki.xyz/search/lyrics?q=${encodeURIComponent(query)}&apikey=${apiKey}`
    
    const res = await fetch(apiUrl)
    const data = await res.json()

    if (!data.status || !data.data) {
      return sock.sendMessage(chatId, { text: `❌ No se encontró la letra para *"${query}"*.` })
    }

    const { artist, title, album, lyrics } = data.data

    const textoLyrics = `🎶 *LETRA DE CANCIÓN* 🎶\n\n` +
      `📌 *Título:* ${title}\n` +
      `👤 *Artista:* ${artist}\n` +
      `💿 *Álbum:* ${album || 'Desconocido'}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `${lyrics}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `✨ *TheYui-MD - Lyrics Service*`

    await sock.sendMessage(chatId, { text: textoLyrics }, { quoted: msg })

  } catch (error) {
    console.error('Error en comando lyrics:', error)
    await sock.sendMessage(chatId, { text: `❌ Ocurrió un error al buscar la letra.` })
  }
}
