import fetch from 'node-fetch'

export const desc = 'Descarga videos de TikTok sin marca de agua usando Delerius API'
export const alias = ['tt', 'tiktok', 'ttdl']
export const categoria = 'descargas'
export const cooldown = 10

export default async function tiktok({ sock, msg, args, chatId, config }) {
  try {
    const query = args[0]
    if (!query || (!query.includes('tiktok.com') && !query.includes('vt.tiktok.com'))) {
      await sock.sendMessage(chatId, {
        text: `❌ *Por favor, ingresa un enlace válido de TikTok.*`
      }, { quoted: msg })
      return
    }

    await sock.sendMessage(chatId, { text: `⏳ *Descargando video de TikTok...*` }, { quoted: msg })

    const dlUrl = `https://api.delirius.online/download/tiktok?url=${encodeURIComponent(query)}`
    const dlRes = await fetch(dlUrl)
    const dlData = await dlRes.json()

    if (!dlData.status || !dlData.data) {
      await sock.sendMessage(chatId, { text: `❌ Error al obtener el video.` }, { quoted: msg })
      return
    }

    const videoItem = dlData.data.meta.media.find(m => m.type === 'video') || dlData.data.meta.media[0]
    const downloadLink = videoItem.url
    const title = dlData.data.title || 'Video de TikTok'

    await sock.sendMessage(chatId, {
      video: { url: downloadLink },
      caption: `✅ *TikTok descargado con éxito*\n\n📌 *Título:* ${title}`
    }, { quoted: msg })

  } catch (error) {
    console.error('Error en tiktok:', error)
    await sock.sendMessage(chatId, { text: `❌ Error al procesar la descarga.` }, { quoted: msg })
  }
}
