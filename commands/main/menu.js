import { obtenerImagenMenuAleatoria } from '../../lib/randomImage.js'

export const desc = 'Muestra el menú neural con selector'
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
  return d + 'ᴅ ' + h + 'ʜ ' + m + 'ᴍ'
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

    let menuText = '┏━━━━━━━━━━━━━━━━━━━━━━━━┓\n' +
                   '┃   🌌  *ᴛʜᴇ ʏᴜɪ-ᴍᴅ ᴠ1*  🌌   ┃\n' +
                   '┗━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n' +
                   '🛰️ *sᴛᴀᴛᴜs ɴᴇᴜʀᴀʟ:*\n' +
                   '» *ᴜᴘᴛɪᴍᴇ:* ' + uptime + '\n' +
                   '» *ʀᴀᴍ:* ' + ram + ' ᴍʙ / 1024 ᴍʙ\n' +
                   '» *ᴜsᴜᴀʀɪᴏs:* ' + totalUsers + '\n' +
                   '» *ᴘʀᴇғɪᴊᴏ:* [ ' + config.prefijo + ' ]\n\n' +
                   '📅 *ғᴇᴄʜᴀ:* ' + fecha + '\n' +
                   '━━━━━━━━━━━━━━━━━━━━━━━━\n' +
                   '✨ *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀᴍɪʟᴄᴀɢɪᴛ*\n' +
                   (isRegistered ? '✅ _¡ᴇsᴛᴀs ʀᴇɢɪsᴛʀᴀᴅᴏ!_' : '💡 _ᴜsᴀ ' + config.prefijo + 'reg ᴘᴀʀᴀ ʀᴇɢɪsᴛʀᴀʀᴛᴇ_')

    const sections = []
    
    sections.push({
      title: '⚡ SISTEMA',
      rows: [
        { title: '⚡ PING', rowId: config.prefijo + 'ping', description: 'Verificar latencia del bot' },
        { title: '🤖 INFO BOT', rowId: config.prefijo + 'infobot', description: 'Información técnica del sistema' }
      ]
    })

    const categorias = Object.keys(porCategoria).sort()
    const rowsCategorias = categorias.map(cat => ({
      title: ICONOS[cat.toLowerCase()] + ' ' + cat.toUpperCase(),
      rowId: config.prefijo + 'help ' + cat.toLowerCase(),
      description: 'Ver comandos de ' + cat
    }))

    sections.push({
      title: '📂 CATEGORÍAS',
      rows: rowsCategorias
    })

    const listMessage = {
      text: menuText.trim(),
      footer: config.nombreBot,
      title: '💠 MENU SELECCTOR 💠',
      buttonText: '🌸 ABRIR SELECTOR 🌸',
      sections
    }

    const imagen = obtenerImagenMenuAleatoria()
    
    if (imagen) {
      try {
        await sock.sendMessage(chatId, { 
          image: imagen, 
          caption: menuText.trim(),
          footer: config.nombreBot,
          buttonText: '🌸 ABRIR SELECTOR 🌸',
          sections
        }, { quoted: msg })
        return 
      } catch (e) {}
    }

    await sock.sendMessage(chatId, listMessage, { quoted: msg })

  } catch (error) {
    console.error('Error en menu:', error)
  }
}
