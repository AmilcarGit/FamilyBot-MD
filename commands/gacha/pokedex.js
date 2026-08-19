import pkg from '@whiskeysockets/baileys'
const { generateWAMessageFromContent } = pkg
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
    const imagen = data.sprites.other['official-artwork'].front_default || data.sprites.front_default

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
                  '✨ *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ' + config.nombreBot + '*'

    const buttons = [
      {
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: '🎒 ᴀᴛʀᴀᴘᴀʀ ' + nombre,
          id: config.prefijo + 'atrapar ' + data.name + ' ' + id
        })
      }
    ]

    const message = {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            header: {
              hasMediaAttachment: true,
              imageMessage: await sock.prepareMessageMedia({ url: imagen }, { upload: sock.waUploadToServer })
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

  } catch (error) {
    console.error('Error en pokedex:', error)
    await sock.sendMessage(chatId, { text: '❌ ᴇʀʀᴏʀ ᴀʟ ᴄᴏɴsᴜʟᴛᴀʀ ʟᴀ ᴘᴏᴋᴇᴅᴇx.' }, { quoted: msg })
  }
}
