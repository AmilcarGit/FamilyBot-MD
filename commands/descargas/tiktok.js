import fetch from 'node-fetch'

export const desc = 'Descarga videos de TikTok usando Lempi API'
export const alias = ['tt', 'tiktok', 'ttdl', 'ttdlfile']
export const categoria = 'descargas'
export const cooldown = 10

export default async function tiktok({ sock, msg, args, chatId, config }) {
  try {
    const query = args.join(' ').trim()
    if (!query) {
      await sock.sendMessage(chatId, {
        text: `❌ *Por favor, ingresa un enlace válido de TikTok.*\n\n*Ejemplo:* \`${config.prefijo}tiktok https://vt.tiktok.com/...\``
      }, { quoted: msg })
      return
    }

    await sock.sendMessage(chatId, {
      text: `⏳ *Procesando video de TikTok...*`
    }, { quoted: msg })

    let downloadLink = query
    let title = 'Video de TikTok'
    let author = 'Desconocido'

    if (query.includes('tiktok.com') && !query.includes('api.lempi.lat')) {
      const apiKey = config.apiKeys?.lempi || 'FamilyBot-MD'
      const dlUrl = `https://api.lempi.lat/dl/tiktok?url=${encodeURIComponent(query)}&apikey=${apiKey}`
      const dlRes = await fetch(dlUrl)
      const dlData = await dlRes.json()

      if (!dlData.status || !dlData.resultado) {
        await sock.sendMessage(chatId, { text: `❌ Error al obtener el video de TikTok.` }, { quoted: msg })
        return
      }

      downloadLink = dlData.resultado.video || dlData.resultado.sinMarca
      title = dlData.resultado.titulo || title
      author = dlData.resultado.autor?.nombre || author
    }

    const caption = `╭━━━〔 📥 *TIKTOK DOWNLOAD* 〕━━━⬣\n` +
                  `┃ ✧ *Autor:* ${author}\n` +
                  `┃ ✧ *Descripción:* ${title}\n` +
                  `┃ ✧ *Proveedor:* \`Lempi API\`\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━⬣`

    await sock.sendMessage(chatId, {
      video: { url: downloadLink },
      caption: caption.trim()
    }, { quoted: msg })

  } catch (error) {
    console.error('Error en comando tiktok:', error)
    await sock.sendMessage(chatId, { text: `❌ Ocurrió un error al procesar la descarga de TikTok.` }, { quoted: msg })
  }
}
