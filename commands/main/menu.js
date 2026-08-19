import { obtenerImagenMenuAleatoria } from '../../lib/randomImage.js'

export const desc = 'Muestra el menú neural de comandos'
export const alias = ['help', 'ayuda', 'menu']
export const cooldown = 5

const ICONOS = {
  main: '💠',
  descargas: '📥',
  economia: '💰',
  gacha: '🧧',
  grupo: '🛡️',
  media: '🎬',
  owner: '👑',
  social: '🎭',
  juegos: '🎮',
  perfil: '👤',
  subbot: '🤖',
  herramientas: '🛠️',
  ia: '🧠',
  premium: '💎'
}

function formatRuntime(seconds) {
  const d = Math.floor(seconds / (3600 * 24))
  const h = Math.floor((seconds % (3600 * 24)) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return \`\${d}ᴅ \${h}ʜ \${m}ᴍ\`
}

export default async function menu({ sock, chatId, comandos, config, db, msg }) {
  try {
    const jidRemitente = msg.key.participant || msg.key.remoteJid
    const isRegistered = db.data.users[jidRemitente]?.registrado
    
    const uptime = formatRuntime(process.uptime())
    const ram = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)
    const totalUsers = Object.keys(db.data.users || {}).length
    const fecha = new Date().toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })

    const porCategoria = {}
    comandos.forEach(c => {
      if (c.oculto || (config.comandosDesactivados || []).includes(c.nombre)) return
      const cat = c.categoria || 'main'
      if (!porCategoria[cat]) porCategoria[cat] = []
      porCategoria[cat].push(c)
    })

    let menuText = \`┏━━━━━━━━━━━━━━━━━━━━━━━━┓
┃   🌌  *ᴛʜᴇ ʏᴜɪ-ᴍᴅ ᴠ1*  🌌   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━┛

🛰️ *sᴛᴀᴛᴜs ɴᴇᴜʀᴀʟ:*
» *ᴜᴘᴛɪᴍᴇ:* \${uptime}
» *ʀᴀᴍ:* \${ram} ᴍʙ / 1024 ᴍʙ
» *ᴜsᴜᴀʀɪᴏs:* \${totalUsers}
» *ᴘʀᴇғɪᴊᴏ:* [ \${config.prefijo} ]

📅 *ғᴇᴄʜᴀ:* \${fecha}
━━━━━━━━━━━━━━━━━━━━━━━━
\`

    const categorias = Object.keys(porCategoria).sort()
    categorias.forEach(cat => {
      const icon = ICONOS[cat.toLowerCase()] || '📂'
      menuText += \`\\n┏━━〔 \${icon} *\${cat.toUpperCase()}* 〕━━┓\\n\`
      
      porCategoria[cat].forEach(c => {
        const requiereReg = !['main', 'owner'].includes(cat.toLowerCase())
        const lock = (requiereReg && !isRegistered) ? ' 🔐' : ''
        
        menuText += \`┃ ✧ *\${config.prefijo}\${c.nombre}*\${lock}\\n\`
        menuText += \`┃   🌾 _\${c.desc || 'sɪɴ ᴅᴇsᴄʀɪᴘᴄɪᴏ́ɴ'}_\\n\`
      })
      
      menuText += \`┗━━━━━━━━━━━━━━━━━━━━┛\\n\`
    })

    menuText += \`\\n✨ *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀᴍɪʟᴄᴀɢɪᴛ*
\${isRegistered ? '✅ _¡ᴇsᴛᴀs ʀᴇɢɪsᴛʀᴀᴅᴏ!_' : '💡 _ᴜsᴀ ' + config.prefijo + 'reg ᴘᴀʀᴀ ʀᴇɢɪsᴛʀᴀʀᴛᴇ_'}\`

    let imagen = null
    try {
      imagen = obtenerImagenMenuAleatoria()
    } catch (e) {}

    if (imagen) {
      await sock.sendMessage(chatId, { image: imagen, caption: menuText.trim() })
    } else {
      await sock.sendMessage(chatId, { text: menuText.trim() })
    }
  } catch (error) {
    console.error('Error en menu:', error)
    await sock.sendMessage(chatId, { text: '❌ Error al generar el menú neural.' })
  }
}
