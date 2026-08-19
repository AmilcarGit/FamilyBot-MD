import { generateWAMessageFromContent, prepareWAMessageMedia } from '@whiskeysockets/baileys'
import fetch from 'node-fetch'

export const desc = 'Busca información detallada de un Pokémon y permite atraparlo'
export const alias = ['pokemon', 'poke']
export const cooldown = 5

export default async function pokedex({ sock, chatId, args, msg, config }) {
  const query = args.join(' ').toLowerCase().trim()
  
  if (!query) {
    return sock.sendMessage(chatId, {
      text: '❌ ᴘᴏʀ ғᴀᴠᴏʀ, ɪɴɢʀᴇsᴀ ᴇʟ ɴᴏᴍʙʀᴇ ᴏ ɴᴜ́ᴍᴇʀᴏ ᴅᴇ ᴜɴ ᴘᴏᴋᴇ́ᴍᴏɴ.\nᴇᴊᴇᴍᴘʟᴏ: *' + config.prefijo + 'pokedex charizard*'
    }, { quoted: msg })
  }

  try {
    const res = await fetch('https://pokeapi.co/api/v2/pokemon/' + query)
    if (!res.ok) {
      return sock.sendMessage(chatId, { text: '❌ ɴᴏ sᴇ ᴇɴᴄᴏɴᴛʀᴏ́ ɴɪɴɢᴜ́ɴ ᴘᴏᴋᴇ́ᴍᴏɴ ʟʟᴀᴍᴀᴅᴏ *"' + query + '"*.' }, { quoted: msg })
    }

    const data = await res.json()
    const nombre = data.name.toUpperCase()
    const id = data.id
    const tipos = data.types.map(t => t.type.name).join(', ')
    const stats = {}
    data.stats.forEach(s => { stats[s.stat.name] = s.base_stat })
    const imagenUrl = data.sprites.other['official-artwork'].front_default || data.sprites.front_default

    const caption = '┏━━━━━━━━━━━━━━━━━━━━━━━━┓\n' +
                  '┃   💠  *ᴘᴏᴋᴇᴅᴇx ɴᴇᴜʀᴀʟ*  💠   ┃\n' +
                  '┗━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n' +
                  '🧬 *ᴅᴀᴛᴏs:*\n' +
                  '» *ɴᴏᴍʙʀᴇ:* ' + nombre + '\n' +
                  '» *ɪᴅ:* #' + id + '\n' +
                  '» *ᴛɪᴘᴏ:* ' + tipos + '\n\n' +
                  '📊 *sᴛᴀᴛs:*\n' +
                  '❤️ ʜᴘ: ' + stats.hp + ' | ⚔️ ᴀᴛᴋ: ' + stats.attack + '\n' +
                  '🛡️ ᴅᴇғ: ' + stats.defense + ' | ⚡ sᴘᴅ: ' + stats.speed + '\n\n' +
                  '━━━━━━━━━━━━━━━━━━━━━━━━\n' +
                  '🎒 _ᴜsᴀ ᴇʟ ʙᴏᴛᴏ́ɴ ᴅᴇ ᴀʙᴀᴊᴏ ᴏ ᴇsᴄʀɪʙᴇ:_\n' +
                  '*' + config.prefijo + 'atrapar ' + data.name + ' ' + id + '*\n\n' +
                  '✨ *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ' + config.nombreBot + '*'

    let buffer = null
    try {
      const imgRes = await fetch(imagenUrl)
      const arrayBuffer = await imgRes.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    } catch (e) {
      console.error('Error descargando imagen:', e)
    }

    try {
      const buttons = [
        {
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({
            display_text: '🎒 ᴀᴛʀᴀᴘᴀʀ ' + nombre,
            id: config.prefijo + 'atrapar ' + data.name + ' ' + id
          })
        }
      ]

      let media = null
      if (buffer) {
        media = await prepareWAMessageMedia({ image: buffer }, { upload: sock.waUploadToServer })
      }

      const message = {
        viewOnceMessage: {
          message: {
            interactiveMessage: {
              header: {
                title: '💠 POKEDEX SYSTEM 💠',
                hasMediaAttachment: !!media,
                imageMessage: media?.imageMessage
              },
              body: { text: caption.trim() },
              footer: { text: config.nombreBot },
              nativeFlowMessage: { buttons: buttons }
            }
          }
        }
      }

      const preparedMessage = generateWAMessageFromContent(chatId, message, { quoted: msg, userJid: sock.user.id })
      await sock.relayMessage(chatId, preparedMessage.message, { messageId: preparedMessage.key.id })
    } catch (interactiveError) {
      console.error('Error enviando mensaje interactivo, usando fallback:', interactiveError)
      if (buffer) {
        await sock.sendMessage(chatId, { image: buffer, caption: caption.trim() }, { quoted: msg })
      } else {
        await sock.sendMessage(chatId, { text: caption.trim() }, { quoted: msg })
      }
    }

  } catch (error) {
    console.error('Error general en pokedex:', error)
    await sock.sendMessage(chatId, { text: '❌ ᴇʀʀᴏʀ ᴀʟ ᴄᴏɴsᴜʟᴛᴀʀ ʟᴀ ᴘᴏᴋᴇ́ᴅᴇx.' }, { quoted: msg })
  }
}
