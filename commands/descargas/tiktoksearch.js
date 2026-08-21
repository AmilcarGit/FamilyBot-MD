import fetch from 'node-fetch'
import * as Baileys from '@whiskeysockets/baileys'

const generateWAMessageFromContent = Baileys.generateWAMessageFromContent || Baileys.default?.generateWAMessageFromContent
const prepareWAMessageMedia = Baileys.prepareWAMessageMedia || Baileys.default?.prepareWAMessageMedia

export const desc = 'Busca videos en TikTok con Lempi API y botones de descarga directa'
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

    const apiKey = config.apiKeys?.lempi || 'FamilyBot-MD'
    const searchUrl = `https://api.lempi.lat/s/tiktok?q=${encodeURIComponent(query)}&apikey=${apiKey}`
    const searchRes = await fetch(searchUrl)
    const searchData = await searchRes.json()

    if (!searchData.status || !searchData.resultado || searchData.resultado.length === 0) {
      await sock.sendMessage(chatId, { text: `❌ No se encontraron resultados en TikTok para: *${query}*` }, { quoted: msg })
      return
    }

    const results = searchData.resultado.slice(0, 3)
    let caption = `┏━━━━━━━━━━━━━━━━━━━━━━━━┓\n` +
                  `┃   🔍  *ᴛɪᴋᴛᴏᴋ sᴇᴀʀᴄʜ*  🔍   ┃\n` +
                  `┗━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n` +
                  `✨ *ʀᴇsᴜʟᴛᴀᴅᴏs ᴘᴀʀᴀ:* _${query}_\n\n`

    const buttons = []

    results.forEach((item, index) => {
      const title = item.titulo || 'Sin título'
      const author = item.autor?.nombre || 'Desconocido'
      const directVideoUrl = item.video

      caption += `*${index + 1}.* ${title.substring(0, 45)}...\n`
      caption += `👤 *ᴀᴜᴛᴏʀ:* ${author}\n\n`

      buttons.push({
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: `📥 ᴅᴇsᴄᴀʀɢᴀʀ #${index + 1}`,
          id: `${config.prefijo}ttdlfile ${directVideoUrl}`
        })
      })
    })

    caption += `━━━━━━━━━━━━━━━━━━━━━━━━\n`
    caption += `💡 *sᴇʟᴇᴄᴄɪᴏɴᴀ ᴜɴ ʙᴏᴛᴏ́ɴ ᴘᴀʀᴀ ᴇɴᴠɪᴀʀ ᴇʟ ᴠɪᴅᴇᴏ*`

    const firstItem = results[0]
    let media = null
    if (firstItem.portada) {
      try {
        media = await prepareWAMessageMedia({ image: { url: firstItem.portada } }, { upload: sock.waUploadToServer })
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
