import fetch from 'node-fetch'
import * as Baileys from '@whiskeysockets/baileys'

const generateWAMessageFromContent = Baileys.generateWAMessageFromContent || Baileys.default?.generateWAMessageFromContent
const prepareWAMessageMedia = Baileys.prepareWAMessageMedia || Baileys.default?.prepareWAMessageMedia

export const desc = 'Busca videos en TikTok con múltiples APIs gratuitas y botones'
export const alias = ['ttsearch', 'tiktoks', 'tsearch']
export const categoria = 'descargas'
export const cooldown = 10

export default async function tiktoksearch({ sock, msg, args, chatId, config }) {
  try {
    const query = args.join(' ').trim()
    if (!query) {
      await sock.sendMessage(chatId, {
        text: `❌ *Por favor, ingresa un término de búsqueda para TikTok.*\n\n*Ejemplo:* \`${config.prefijo}tiktoksearch bad bunny\``
      }, { quoted: msg })
      return
    }

    await sock.sendMessage(chatId, {
      text: `⏳ *Buscando en TikTok con redes neuronales libres...*`
    }, { quoted: msg })

    let results = []

    try {
      const url1 = `https://api.siputzx.my.id/api/s/tiktok?query=${encodeURIComponent(query)}`
      const res1 = await fetch(url1)
      const data1 = await res1.json()
      if (data1.status && data1.data && data1.data.length > 0) {
        results = data1.data.slice(0, 3).map(item => ({
          title: item.title || item.titulo || 'Sin título',
          author: item.author || item.autor?.nombre || 'Desconocido',
          video: item.nowm || item.no_watermark || item.video,
          portada: item.cover || item.thumbnail || item.portada
        }))
      }
    } catch (e) {}

    if (results.length === 0) {
      try {
        const url2 = `https://api.vkrnet.in/api/tiktoksearch?query=${encodeURIComponent(query)}`
        const res2 = await fetch(url2)
        const data2 = await res2.json()
        if (data2.results && data2.results.length > 0) {
          results = data2.results.slice(0, 3).map(item => ({
            title: item.title || 'Sin título',
            author: item.author || 'Desconocido',
            video: item.nowm || item.video,
            portada: item.cover || item.thumbnail
          }))
        }
      } catch (e) {}
    }

    if (results.length === 0) {
      await sock.sendMessage(chatId, { text: `❌ No se encontraron resultados en TikTok para: *${query}*` }, { quoted: msg })
      return
    }

    let caption = `┏━━━━━━━━━━━━━━━━━━━━━━━━┓\n` +
                  `┃   🔍  *ᴛɪᴋᴛᴏᴋ sᴇᴀʀᴄʜ*  🔍   ┃\n` +
                  `┗━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n` +
                  `✨ *ʀᴇsᴜʟᴛᴀᴅᴏs ᴘᴀʀᴀ:* _${query}_\n\n`

    const buttons = []

    results.forEach((item, index) => {
      caption += `*${index + 1}.* ${item.title.substring(0, 45)}...\n`
      caption += `👤 *ᴀᴜᴛᴏʀ:* ${item.author}\n\n`

      buttons.push({
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: `📥 ᴅᴇsᴄᴀʀɢᴀʀ #${index + 1}`,
          id: `${config.prefijo}ttdlfile ${item.video}`
        })
      })
    })

    caption += `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
               `💡 *sᴇʟᴇᴄᴄɪᴏɴᴀ ᴜɴ ʙᴏᴛᴏ́ɴ ᴘᴀʀᴀ ᴇɴᴠɪᴀʀ ᴇʟ ᴠɪᴅᴇᴏ*`

    let media = null
    if (results[0].portada) {
      try {
        media = await prepareWAMessageMedia({ image: { url: results[0].portada } }, { upload: sock.waUploadToServer })
      } catch (e) {}
    }

    const interactiveMessage = {
      body: { text: caption },
      footer: { text: config.nombreBot },
      header: {
        title: `🌌 *ᴛʜᴇ ʏᴜɪ-ᴍᴅ ɴᴇᴜʀᴀʟ*`,
        hasMediaAttachment: !!media,
        imageMessage: media ? media.imageMessage : null
      },
      nativeFlowMessage: {
        buttons: buttons
      }
    }

    const message = generateWAMessageFromContent(chatId, {
      viewOnceMessage: {
        message: {
          interactiveMessage: interactiveMessage
        }
      }
    }, { quoted: msg })

    await sock.relayMessage(chatId, message.message, { messageId: message.key.id })

  } catch (error) {
    console.error('Error en tiktoksearch:', error)
    await sock.sendMessage(chatId, { text: `❌ Error al realizar la búsqueda en TikTok.` }, { quoted: msg })
  }
}
