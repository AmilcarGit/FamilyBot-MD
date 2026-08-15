export const desc = 'Descarga videos de Facebook.'
export const alias = ['fb', 'fbdl']
export const cooldown = 10

export default async function facebook({ sock, chatId, args, msg, config }) {
  const url = args[0]
  
  if (!url) {
    return sock.sendMessage(chatId, {
      text: `❌ Por favor, ingresa un enlace de Facebook.\nEjemplo: *${config.prefijo}fb https://www.facebook.com/...*`
    })
  }

  try {
    await sock.sendMessage(chatId, { text: `⏳ Procesando video de Facebook...` }, { quoted: msg })

    const apiKey = 'lem954'
    const apiUrl = `https://api.lempi.lat/dl/facebook?url=${encodeURIComponent(url)}&quality=hd&apikey=${apiKey}`
    const res = await fetch(apiUrl)
    const data = await res.json()

    if (!data.status || !data.datos || !data.datos.url) {
      return sock.sendMessage(chatId, { text: `❌ No se pudo descargar el video. Verifica que el enlace sea público.` })
    }

    const { titulo, autor, duracion, datos } = data

    await sock.sendMessage(chatId, {
      video: { url: datos.url },
      caption: `🎬 *Título:* ${titulo || 'Facebook Video'}\n👤 *Autor:* ${autor.nombre}\n⏱️ *Duración:* ${duracion}\n✅ *Descargado con éxito*`,
      mimetype: 'video/mp4'
    }, { quoted: msg })

  } catch (error) {
    console.error('Error en comando facebook:', error)
    await sock.sendMessage(chatId, { text: `❌ Ocurrió un error al descargar el video de Facebook.` })
  }
}
