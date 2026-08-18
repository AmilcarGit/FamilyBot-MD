export const desc = 'Busca información detallada de un Pokémon'
export const alias = ['pokemon', 'poke']
export const cooldown = 5

export default async function pokedex({ sock, chatId, args, msg, config }) {
  const query = args.join(' ').toLowerCase().trim()
  
  if (!query) {
    return sock.sendMessage(chatId, {
      text: `❌ ᴘᴏʀ ғᴀᴠᴏʀ, ɪɴɢʀᴇsᴀ ᴇʟ ɴᴏᴍʙʀᴇ ᴏ ɴᴜ́ᴍᴇʀᴏ ᴅᴇ ᴜɴ ᴘᴏᴋᴇ́ᴍᴏɴ.\nᴇᴊᴇᴍᴘʟᴏ: *${config.prefijo}pokedex charizard*`
    }, { quoted: msg })
  }

  try {
    const res = await fetch(\`https://pokeapi.co/api/v2/pokemon/\${query}\`)
    if (!res.ok) {
      return sock.sendMessage(chatId, { text: \`❌ ɴᴏ sᴇ ᴇɴᴄᴏɴᴛʀᴏ́ ɴɪɴɢᴜ́ɴ ᴘᴏᴋᴇ́ᴍᴏɴ ʟʟᴀᴍᴀᴅᴏ *"\${query}"*.\` }, { quoted: msg })
    }

    const data = await res.json()
    const nombre = data.name.toUpperCase()
    const id = data.id
    const tipos = data.types.map(t => t.type.name).join(', ')
    const stats = {}
    data.stats.forEach(s => { stats[s.stat.name] = s.base_stat })
    const imagen = data.sprites.other['official-artwork'].front_default || data.sprites.front_default

    const caption = \`
┏━━━━━━━━━━━━━━━━━━━━━━━━┓
┃   💠  *ᴘᴏᴋᴇᴅᴇx ɴᴇᴜʀᴀʟ*  💠   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━┛

🧬 *ᴅᴀᴛᴏs:*
» *ɴᴏᴍʙʀᴇ:* \${nombre}
» *ɪᴅ:* #\${id}
» *ᴛɪᴘᴏ:* \${tipos}

📊 *sᴛᴀᴛs:*
❤️ ʜᴘ: \${stats.hp} | ⚔️ ᴀᴛᴋ: \${stats.attack}
🛡️ ᴅᴇғ: \${stats.defense} | ⚡ sᴘᴅ: \${stats.speed}

━━━━━━━━━━━━━━━━━━━━━━━━
✨ *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴛʜᴇʏᴜɪ sʏsᴛᴇᴍ*
━━━━━━━━━━━━━━━━━━━━━━━━\`.trim()

    await sock.sendMessage(chatId, {
      image: { url: imagen },
      caption: caption,
      footer: config.nombreBot
    }, { quoted: msg })

  } catch (error) {
    console.error('Error en pokedex:', error)
    await sock.sendMessage(chatId, { text: \`❌ ᴇʀʀᴏʀ ᴀʟ ᴄᴏɴsᴜʟᴛᴀʀ ʟᴀ ᴘᴏᴋᴇᴅᴇx.\` }, { quoted: msg })
  }
}
