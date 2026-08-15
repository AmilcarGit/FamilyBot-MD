export const desc = 'Descarga videos e imágenes de Instagram.'
export const alias = ['ig', 'igdl', 'reel']
export const cooldown = 10

export default async function instagram({ sock, chatId, args, msg, config }) {
  const url = args[0]
  
  if (!url) {
    return sock.sendMessage(chatId, {
      text: `❌ Por favor, ingresa un enlace de Instagram.\nEjemplo: *${config.prefijo}ig https://www.instagram.com/p/...*`
    })
  }

  try {
    await sock.sendMessage(chatId, { text: `⏳ Procesando enlace de Instagram...` }, { quoted: msg })

    const apiKey = 'lem954'
    const apiUrl = `https://api.lempi.lat/dl/instagram?url=${encodeURIComponent(url)}&apikey=${apiKey}`
    const res = await fetch(apiUrl)
    const data = await res.json()

    if (!data.status || !data.datos) {
      return sock.sendMessage(chatId, { text: `❌ No se pudo descargar el contenido de Instagram. Verifica que sea público.` })
    }

    const { metadata, datos } = data

    if (datos.videos && datos.videos.length > 0) {
      for (const videoUrl of datos.videos) {
        await sock.sendMessage(chatId, {
          video: { url: videoUrl },
          caption: `📸 *Instagram de:* @${metadata.username}\n📝 *Caption:* ${metadata.caption?.substring(0, 200) || 'Sin descripción'}...`,
          mimetype: 'video/mp4'
        }, { quoted: msg })
      }
    }

    if (datos.imagenes && datos.imagenes.length > 0) {
      for (const imageUrl of datos.imagenes) {
        await sock.sendMessage(chatId, {
          image: { url: imageUrl },
          caption: `📸 *Instagram de:* @${metadata.username}`
        }, { quoted: msg })
      }
    }

  } catch (error) {
    console.error('Error en comando instagram:', error)
    await sock.sendMessage(chatId, { text: `❌ Ocurrió un error al descargar de Instagram.` })
  }
}
