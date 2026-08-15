export const desc = 'Descarga videos de TikTok sin marca de agua.'
export const alias = ['tk', 'tt', 'tiktokdl']
export const cooldown = 10

export default async function tiktok({ sock, chatId, args, msg, config }) {
  const url = args[0]
  
  if (!url) {
    return sock.sendMessage(chatId, {
      text: `❌ Por favor, ingresa un enlace de TikTok.\nEjemplo: *${config.prefijo}tiktok https://www.tiktok.com/...*`
    })
  }

  try {
    await sock.sendMessage(chatId, { text: `⏳ Descargando video de TikTok...` }, { quoted: msg })

    const apiKey = 'lem954'
    const apiUrl = `https://api.lempi.lat/dl/tiktok?url=${encodeURIComponent(url)}&apikey=${apiKey}`
    const res = await fetch(apiUrl)
    const data = await res.json()

    if (!data.status || !data.datos || !data.datos.url) {
      return sock.sendMessage(chatId, { text: `❌ No se pudo descargar el video de TikTok. Verifica el enlace.` })
    }

    const { titulo, autor, duracion, datos } = data

    await sock.sendMessage(chatId, {
      video: { url: datos.url },
      caption: `🎬 *Título:* ${titulo || 'TikTok Video'}\n👤 *Autor:* ${autor.nombre} (@${autor.usuario})\n⏱️ *Duración:* ${duracion}s\n✅ *Sin marca de agua*`,
      mimetype: 'video/mp4'
    }, { quoted: msg })

  } catch (error) {
    console.error('Error en comando tiktok:', error)
    await sock.sendMessage(chatId, { text: `❌ Ocurrió un error al descargar de TikTok.` })
  }
}
