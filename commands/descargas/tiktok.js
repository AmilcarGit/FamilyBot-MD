import fetch from 'node-fetch'

export const desc = 'Descarga videos de TikTok sin marca de agua usando FamilyBot-MD API'
export const alias = ['tt', 'tiktok', 'ttdl']
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

    if (!query.includes('tiktok.com')) {
      await sock.sendMessage(chatId, { text: `❌ Ese no parece un link válido de TikTok.` }, { quoted: msg })
      return
    }

    await sock.sendMessage(chatId, {
      text: `⏳ *Procesando video de TikTok...*`
    }, { quoted: msg })

    // Tu API personal de FamilyBot-MD
    const apiKey = config.apiKeys?.familybot || 'familybot-md'
    const dlUrl = `https://familybot-md-api.onrender.com/api/download/tiktok?apiKey=${apiKey}&url=${encodeURIComponent(query)}`

    const dlRes = await fetch(dlUrl)
    const dlData = await dlRes.json()

    if (!dlData.status || !dlData.data) {
      await sock.sendMessage(chatId, { text: `❌ ${dlData.message || 'Error al obtener el video de TikTok.'}` }, { quoted: msg })
      return
    }

    const v = dlData.data
    const downloadLink = v.media?.no_watermark
    const title = v.title || 'Video de TikTok'
    const author = v.author?.nickname || 'Desconocido'

    const caption = `╭━━━〔 📥 *TIKTOK DOWNLOAD* 〕━━━⬣\n` +
                  `┃ ✧ *Autor:* ${author}\n` +
                  `┃ ✧ *Descripción:* ${title}\n` +
                  `┃ ✧ *▶ Reproducciones:* ${v.stats?.plays || 0}\n` +
                  `┃ ✧ *❤ Likes:* ${v.stats?.likes || 0}\n` +
                  `┃ ✧ *Proveedor:* \`FamilyBot-MD API\`\n` +
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