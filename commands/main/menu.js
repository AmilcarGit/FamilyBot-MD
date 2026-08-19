import { obtenerImagenMenuAleatoria } from '../../lib/randomImage.js'

export const desc = 'Muestra el menu del bot'
export const alias = ['help', 'ayuda', 'menu']
export const cooldown = 5

const ICONOS = {
  main: '🏠',
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
  return d + 'd ' + h + 'h ' + m + 'm'
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

    let menuText = '====================\n' +
                   '   THE YUI-MD V1\n' +
                   '====================\n\n' +
                   'STATUS:\n' +
                   '- Uptime: ' + uptime + '\n' +
                   '- RAM: ' + ram + ' MB / 1024 MB\n' +
                   '- Usuarios: ' + totalUsers + '\n' +
                   '- Prefijo: [ ' + config.prefijo + ' ]\n\n' +
                   'Fecha: ' + fecha + '\n' +
                   '--------------------\n'

    const categorias = Object.keys(porCategoria).sort()
    categorias.forEach(cat => {
      const icon = ICONOS[cat.toLowerCase()] || '📂'
      menuText += '\n[ ' + icon + ' ' + cat.toUpperCase() + ' ]\n'
      
      porCategoria[cat].forEach(c => {
        const requiereReg = !['main', 'owner'].includes(cat.toLowerCase())
        const lock = (requiereReg && !isRegistered) ? ' (L)' : ''
        
        menuText += '> ' + config.prefijo + c.nombre + lock + '\n'
        menuText += '  ' + (c.desc || 'Sin descripcion') + '\n'
      })
    })

    menuText += '\nPowered by AmilcarGit\n' +
                (isRegistered ? 'Usuario Registrado' : 'Usa ' + config.prefijo + 'reg para registrarte')

    const buttons = [
      { buttonId: config.prefijo + 'premium', buttonText: { displayText: 'Premium' }, type: 1 },
      { buttonId: config.prefijo + 'infobot', buttonText: { displayText: 'Info Bot' }, type: 1 },
      { buttonId: config.prefijo + 'owner', buttonText: { displayText: 'Owner' }, type: 1 }
    ]

    const imagen = obtenerImagenMenuAleatoria()
    
    if (imagen) {
      await sock.sendMessage(chatId, { 
        image: imagen, 
        caption: menuText.trim(),
        footer: config.nombreBot,
        buttons: buttons,
        headerType: 4
      }, { quoted: msg })
    } else {
      await sock.sendMessage(chatId, { 
        text: menuText.trim(),
        footer: config.nombreBot,
        buttons: buttons,
        headerType: 1
      }, { quoted: msg })
    }
  } catch (error) {
    console.error('Error en menu:', error)
    await sock.sendMessage(chatId, { text: 'Error al generar el menu.' })
  }
}
