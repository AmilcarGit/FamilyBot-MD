import fetch from 'node-fetch'
import { guardarEnCache } from '../../lib/pokedexJuego.js'
import pkg from '@whiskeysockets/baileys'
const { prepareWAMessageMedia, generateWAMessageFromContent } = pkg
import Jimp from 'jimp'

export const desc = 'Busca información detallada de un Pokémon con Interfaz Neural'
export const alias = ['pokemon', 'poke']
export const cooldown = 5

export default async function pokedex({ sock, chatId, args, msg, config }) {
  const query = args.join(' ').toLowerCase().trim()
  if (!query) return sock.sendMessage(chatId, { text: '❌ ɪɴɢʀᴇsᴀ ᴇʟ ɴᴏᴍʙʀᴇ ᴅᴇ ᴜɴ ᴘᴏᴋᴇ́ᴍᴏɴ.' }, { quoted: msg })

  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${query}`)
    if (!res.ok) return sock.sendMessage(chatId, { text: '❌ ɴᴏ ᴇɴᴄᴏɴᴛʀᴀᴅᴏ.' }, { quoted: msg })

    const data = await res.json()
    const nombre = data.name.toUpperCase()
    const id = data.id
    const imagenUrl = data.sprites.other['official-artwork'].front_default || data.sprites.front_default
    
    guardarEnCache(id, { nombre, tipos: data.types.map(t => t.type.name).join(', '), statsTotal: 500 })

    const caption = `┏━━━━━━━━━━━━━━━━━━━━━━━━┓
┃   💠  *ᴘᴏᴋᴇᴅᴇx ɴᴇᴜʀᴀʟ*  💠   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━┛
🧬 *ɴᴏᴍʙʀᴇ:* ${nombre} | *ɪᴅ:* #${id}
📊 *sᴛᴀᴛs:* HP: ${data.stats[0].base_stat} | ATK: ${data.stats[1].base_stat}
━━━━━━━━━━━━━━━━━━━━━━━━`.trim()

    let imageBuffer = null
    try {
      const imgRes = await fetch(imagenUrl)
      const image = await Jimp.read(Buffer.from(await imgRes.arrayBuffer()))
      image.resize(500, 500).quality(80)
      imageBuffer = await image.getBufferAsync(Jimp.MIME_PNG)
    } catch (e) { console.error(e) }

    const buttons = [
      { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🎯 ᴀᴛʀᴀᴘᴀʀ", id: `${config.prefijo}pokeatrapar ${id}` }) },
      { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🎒 ᴍᴏᴄʜɪʟᴀ", id: `${config.prefijo}mochila` }) }
    ]

    try {
      let media = imageBuffer ? await prepareWAMessageMedia({ image: imageBuffer }, { upload: sock.waUploadToServer }) : null
      const message = generateWAMessageFromContent(chatId, {
        viewOnceMessage: {
          message: {
            interactiveMessage: {
              body: { text: caption },
              footer: { text: config.nombreBot },
              header: { title: `💠 *${nombre}*`, hasMediaAttachment: !!media, imageMessage: media?.imageMessage },
              nativeFlowMessage: { buttons }
            }
          }
        }
      }, { quoted: msg })
      await sock.relayMessage(chatId, message.message, { messageId: message.key.id })
    } catch (e) {
      await sock.sendMessage(chatId, { text: caption + `\n\n🎯 *Atrapar:* ${config.prefijo}pokeatrapar ${id}` }, { quoted: msg })
    }
  } catch (error) { console.error(error) }
}
