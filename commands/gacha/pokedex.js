import axios from 'axios'

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
    const res = await axios.get('https://pokeapi.co/api/v2/pokemon/' + query)
    const data = res.data
    
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
                  '✨ *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ' + config.nombreBot + '*'

    const buttonText = '🎒 ᴀᴛʀᴀᴘᴀʀ ' + nombre
    const buttonId = config.prefijo + 'atrapar ' + data.name + ' ' + id

    try {
      await sock.sendMessage(chatId, {
        image: { url: imagenUrl },
        caption: caption.trim(),
        footer: config.nombreBot,
        buttons: [{ buttonId: buttonId, buttonText: { displayText: buttonText }, type: 1 }],
        headerType: 4
      }, { quoted: msg })
    } catch (e) {
      await sock.sendMessage(chatId, {
        text: caption.trim() + '\n\n🎒 *ᴘᴀʀᴀ ᴀᴛʀᴀᴘᴀʀ ᴜsᴀ:* ' + buttonId,
        footer: config.nombreBot,
        buttons: [{ buttonId: buttonId, buttonText: { displayText: buttonText }, type: 1 }],
        headerType: 1
      }, { quoted: msg })
    }

  } catch (error) {
    await sock.sendMessage(chatId, { text: '❌ ɴᴏ sᴇ ᴇɴᴄᴏɴᴛʀᴏ́ ᴇʟ ᴘᴏᴋᴇ́ᴍᴏɴ ᴏ ʜᴀʏ ᴜɴ ᴇʀʀᴏʀ ᴅᴇ ʀᴇᴅ.' }, { quoted: msg })
  }
}
