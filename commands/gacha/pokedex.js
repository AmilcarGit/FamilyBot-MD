import fetch from 'node-fetch'
import { guardarEnCache } from '../../lib/pokedexJuego.js'
import Jimp from 'jimp'

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

    guardarEnCache(id, { nombre, tipos, statsTotal: stats.hp + stats.attack + stats.defense + stats.speed })

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

    let imageBuffer = null
    try {
      const imgRes = await fetch(imagenUrl)
      const arrayBuffer = await imgRes.arrayBuffer()
      const image = await Jimp.read(Buffer.from(arrayBuffer))
      image.resize(400, 400).quality(75)
      imageBuffer = await image.getBufferAsync(Jimp.MIME_PNG)
    } catch (e) {}

    const buttons = [
      { buttonId: `${config.prefijo}pokeatrapar ${id}`, buttonText: { displayText: '🎯 ᴀᴛʀᴀᴘᴀʀ' }, type: 1 },
      { buttonId: `${config.prefijo}mochila`, buttonText: { displayText: '🎒 ᴍᴏᴄʜɪʟᴀ' }, type: 1 }
    ]

    try {
      if (imageBuffer) {
        await sock.sendMessage(chatId, {
          image: imageBuffer,
          caption: caption,
          footer: config.nombreBot,
          buttons: buttons,
          headerType: 4
        }, { quoted: msg })
      } else {
        throw new Error('Sin imagen')
      }
    } catch (e) {
      try {
        await sock.sendMessage(chatId, {
          text: caption,
          footer: config.nombreBot,
          buttons: buttons,
          headerType: 1
        }, { quoted: msg })
      } catch (e2) {
        await sock.sendMessage(chatId, { 
          text: caption + `\n\n🎯 *Atrapar:* ${config.prefijo}pokeatrapar ${id}\n🎒 *Mochila:* ${config.prefijo}mochila` 
        }, { quoted: msg })
      }
    }

  } catch (error) {
    console.error('Error en pokedex:', error)
    await sock.sendMessage(chatId, { text: '❌ ᴇʀʀᴏʀ ᴀʟ ᴄᴏnsᴜʟᴛᴀʀ ʟᴀ ᴘᴏᴋᴇᴅᴇx.' }, { quoted: msg })
  }
}
