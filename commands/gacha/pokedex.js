import { generateWAMessageFromContent, prepareWAMessageMedia, proto } from '@whiskeysockets/baileys'
import fetch from 'node-fetch'
import { guardarEnCache } from '../../lib/pokedexJuego.js'

export const desc = 'Busca información detallada de un Pokémon con Interfaz Neural'
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
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${query}`)
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
    const statsTotal = Object.values(stats).reduce((a, b) => a + b, 0)

    guardarEnCache(id, { nombre, tipos, statsTotal })

    const caption = `┏━━━━━━━━━━━━━━━━━━━━━━━━┓
┃   💠  *ᴘᴏᴋᴇᴅᴇx ɴᴇᴜʀᴀʟ*  💠   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━┛

🧬 *ᴅᴀᴛᴏs:*
» *ɴᴏᴍʙʀᴇ:* ${nombre}
» *ɪᴅ:* #${id}
» *ᴛɪᴘᴏ:* ${tipos}

📊 *sᴛᴀᴛs:*
❤️ ʜᴘ: ${stats.hp} | ⚔️ ᴀᴛᴋ: ${stats.attack}
🛡️ ᴅᴇғ: ${stats.defense} | ⚡ sᴘᴅ: ${stats.speed}

━━━━━━━━━━━━━━━━━━━━━━━━
✨ *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${config.nombreBot}*
━━━━━━━━━━━━━━━━━━━━━━━━`.trim()

    let media = null
    try {
      media = await prepareWAMessageMedia({ image: { url: imagenUrl } }, { upload: sock.waUploadToServer })
    } catch (e) {
      console.log('Modo texto activado por fallo de media')
    }

    const buttons = [
      {
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: '🎯 ᴀᴛʀᴀᴘᴀʀ ' + nombre,
          id: config.prefijo + 'pokeatrapar ' + id
        })
      },
      {
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: '🎒 ᴍᴏᴄʜɪʟᴀ',
          id: config.prefijo + 'mochila'
        })
      }
    ]

    const interactiveMessage = {
      header: {
        title: '💠 POKEDEX NEURAL 💠',
        hasMediaAttachment: !!media,
        imageMessage: media ? media.imageMessage : null
      },
      body: {
        text: caption
      },
      footer: {
        text: config.nombreBot
      },
      nativeFlowMessage: {
        buttons: buttons
      }
    }

    const messageContent = generateWAMessageFromContent(chatId, {
      viewOnceMessage: {
        message: {
          interactiveMessage
        }
      }
    }, { quoted: msg, userJid: sock.user.id })

    await sock.relayMessage(chatId, messageContent.message, { messageId: messageContent.key.id })

  } catch (error) {
    console.error('Error en pokedex:', error)
    await sock.sendMessage(chatId, { text: '❌ ᴇʀʀᴏʀ ᴀʟ ᴄᴏɴsᴜʟᴛᴀʀ ʟᴀ ᴘᴏᴋᴇᴅᴇx.' }, { quoted: msg })
  }
}
