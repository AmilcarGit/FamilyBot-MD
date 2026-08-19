export const desc = 'Atrapa un Pokémon y lo guarda en tu mochila'
export const alias = ['catch', 'capturar']
export const cooldown = 5

export default async function atrapar({ sock, chatId, args, msg, db, config }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  
  if (!db.data.users[jidRemitente]) {
    db.data.users[jidRemitente] = { registrado: false, pokedex: [], coins: 0 }
  }

  const user = db.data.users[jidRemitente]

  if (!user.registrado) {
    return sock.sendMessage(chatId, { 
      text: '❌ ᴅᴇʙᴇs ᴇsᴛᴀʀ ʀᴇɢɪsᴛʀᴀᴅᴏ ᴘᴀʀᴀ ᴀᴛʀᴀᴘᴀʀ ᴘᴏᴋᴇ́ᴍᴏɴs.\n💡 _ᴜsᴀ ' + config.prefijo + 'reg ᴘᴀʀᴀ ʀᴇɢɪsᴛʀᴀʀᴛᴇ_' 
    }, { quoted: msg })
  }

  const pokemonName = args[0]
  const pokemonId = args[1]

  if (!pokemonName || !pokemonId) {
    return sock.sendMessage(chatId, { text: '❌ ᴅᴇʙᴇs ᴜsᴀʀ ᴇʟ ʙᴏᴛᴏ́ɴ ᴅᴇ ᴄᴀᴘᴛᴜʀᴀ ᴅᴇsᴅᴇ ʟᴀ ᴘᴏᴋᴇᴅᴇx.' }, { quoted: msg })
  }

  if (!user.pokedex) {
    user.pokedex = []
  }

  const nombreFormateado = pokemonName.toUpperCase()
  user.pokedex.push({ id: pokemonId, name: nombreFormateado, fecha: new Date().toISOString() })

  await db.write()

  const caption = '🎉 ¡ғᴇʟɪᴄɪᴅᴀᴅᴇs!\n\n' +
                  '🎒 ᴀᴛʀᴀᴘᴀsᴛᴇ ᴀ *' + nombreFormateado + '* (ID: #' + pokemonId + ')\n' +
                  '✨ ʜᴀ sɪᴅᴏ ᴀɢʀᴇɢᴀᴅᴏ ᴀ ᴛᴜ ᴍᴏᴄʜɪʟᴀ.\n\n' +
                  '📊 _ᴛᴏᴛᴀʟ ᴅᴇ ᴘᴏᴋᴇ́ᴍᴏɴs ᴇɴ ᴍᴏᴄʜɪʟᴀ: ' + user.pokedex.length + '_'

  await sock.sendMessage(chatId, { text: caption }, { quoted: msg })
}
