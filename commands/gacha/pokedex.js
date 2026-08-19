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
                  '✨ *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ' + config.nombreBot + '*'

    const buttons = [
      { buttonId: config.prefijo + 'atrapar ' + data.name + ' ' + id, buttonText: { displayText: '🎒 ᴀᴛʀᴀᴘᴀʀ ' + nombre }, type: 1 }
    ]

    await sock.sendMessage(chatId, {
      image: { url: imagenUrl },
      caption: caption.trim(),
      footer: config.nombreBot,
      buttons: buttons,
      headerType: 4
    }, { quoted: msg })

  } catch (error) {
    console.error('Error en pokedex:', error)
    await sock.sendMessage(chatId, { text: '❌ ᴇʀʀᴏʀ ᴀʟ ᴄᴏɴsᴜʟᴛᴀʀ ʟᴀ ᴘᴏᴋᴇᴅᴇx.' }, { quoted: msg })
  }
}
