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
    console.log(`[Pokedex] Buscando: ${query}`)
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
                  '🎒 _ᴘᴀʀᴀ ᴀᴛʀᴀᴘᴀʀʟᴏ ᴇsᴄʀɪʙᴇ:_\n' +
                  '*' + config.prefijo + 'atrapar ' + data.name + ' ' + id + '*\n\n' +
                  '✨ *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ' + config.nombreBot + '*'

    console.log(`[Pokedex] Enviando resultado para: ${nombre}`)
    
    try {
      await sock.sendMessage(chatId, { 
        image: { url: imagenUrl }, 
        caption: caption.trim() 
      }, { quoted: msg })
    } catch (mediaError) {
      console.error('[Pokedex] Error enviando imagen, enviando solo texto:', mediaError)
      await sock.sendMessage(chatId, { text: caption.trim() }, { quoted: msg })
    }

  } catch (error) {
    console.error('[Pokedex] Error general:', error)
    await sock.sendMessage(chatId, { text: '❌ ᴇʀʀᴏʀ ᴀʟ ᴄᴏɴsᴜʟᴛᴀʀ ʟᴀ ᴘᴏᴋᴇ́ᴅᴇx.' }, { quoted: msg })
  }
}
