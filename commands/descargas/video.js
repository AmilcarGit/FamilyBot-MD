import fetch from 'node-fetch'

export const desc = 'Descarga videos de YouTube y Shorts usando la API neural de Delerius'
export const alias = ['ytmp4', 'video', 'ytvideo']
export const categoria = 'descargas'
export const cooldown = 10

export default async function video({ sock, msg, args, chatId, config }) {
  try {
    const query = args.join(' ').trim()
    if (!query) {
      await sock.sendMessage(chatId, {
        text: `❌ *Por favor, ingresa el título o enlace de un video de YouTube.*\n\n*Ejemplo:* \`${config.prefijo}video https://youtube.com/shorts/...\``
      }, { quoted: msg })
      return
    }

    await sock.sendMessage(chatId, {
      text: `⏳ *Procesando video con Delerius API...*`
    }, { quoted: msg })

    let videoUrl = query
    const isUrl = query.startsWith('http://') || query.startsWith('https://') || query.includes('youtube.com') || query.includes('youtu.be')

    if (!isUrl) {
      const searchUrl = `https://api.delirius.online/search/ytsearch?q=${encodeURIComponent(query)}`
      const searchRes = await fetch(searchUrl)
      const searchContentType = searchRes.headers.get('content-type') || ''
      if (!searchContentType.includes('application/json')) {
        await sock.sendMessage(chatId, { text: `❌ El servidor de Delerius API no respondió con JSON (Búsqueda).` }, { quoted: msg })
        return
      }
      const searchData = await searchRes.json()

      if (!searchData.status || !searchData.data || searchData.data.length === 0) {
        await sock.sendMessage(chatId, { text: `❌ No se encontraron resultados para: *${query}*` }, { quoted: msg })
        return
      }

      videoUrl = searchData.data[0].url
    }

    const dlUrl = `https://api.delirius.online/download/ytmp4?url=${encodeURIComponent(videoUrl)}`
    const dlRes = await fetch(dlUrl)
    const dlContentType = dlRes.headers.get('content-type') || ''
    if (!dlContentType.includes('application/json')) {
      await sock.sendMessage(chatId, { text: `❌ El servidor de Delerius API no respondió con JSON (Descarga).` }, { quoted: msg })
      return
    }
    const dlData = await dlRes.json()

    if (!dlData.status || !dlData.data || !dlData.data.download) {
      await sock.sendMessage(chatId, { text: `❌ Error al obtener el enlace de descarga del video.` }, { quoted: msg })
      return
    }

    const downloadLink = dlData.data.download
    const title = dlData.data.title || 'Video de YouTube'
    const duration = dlData.data.duration || 'Desconocida'

    const caption = `╭━━━〔 📥 *YOUTUBE VIDEO* 〕━━━⬣\n` +
                  `┃ ✧ *Título:* ${title}\n` +
                  `┃ ✧ *Duración:* ${duration}\n` +
                  `┃ ✧ *Proveedor:* \`Delerius API\`\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━⬣`

    await sock.sendMessage(chatId, {
      video: { url: downloadLink },
      caption: caption.trim()
    }, { quoted: msg })

  } catch (error) {
    console.error('Error en comando video:', error)
    await sock.sendMessage(chatId, { text: `❌ Ocurrió un error al procesar la descarga del video.` }, { quoted: msg })
  }
}
