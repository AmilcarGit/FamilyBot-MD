import { obtenerImagenMenuAleatoria } from '../../lib/randomImage.js'

export const desc = 'Muestra el menú compacto de comandos de FamilyBot-MD'
export const alias = ['help', 'ayuda', 'menu']
export const categoria = 'main'
export const cooldown = 5

const ICONOS = {
  main: '◈',
  descargas: '⌁',
  economia: '₿',
  gacha: '✦',
  grupo: '⬢',
  media: '◉',
  owner: '♛',
  social: '♡',
  juegos: '♧',
  perfil: '◎',
  subbot: '⌘',
  herramientas: '⚙',
  ia: 'Ψ',
  premium: '◇'
}

function formatRuntime(seconds) {
  const horas = Math.floor(seconds / 3600)
  const minutos = Math.floor((seconds % 3600) / 60)
  return `${horas}h ${minutos}m`
}

function recortar(texto, limite) {
  const valor = String(texto || '').replace(/[\n\r]+/g, ' ').trim()
  return valor.length > limite ? `${valor.slice(0, limite - 1)}…` : valor
}

function construirLineaComandos(lista, prefijo, registrado, categoria) {
  const requiereRegistro = !['main', 'owner'].includes(categoria.toLowerCase())
  return lista.map(comando => {
    const candado = requiereRegistro && !registrado ? ' 🔒' : ''
    return `${prefijo}${comando.nombre}${candado}`
  }).join('  ·  ')
}

export default async function menu({ sock, chatId, comandos, config, db, msg }) {
  try {
    const jidRemitente = msg.key.participant || msg.key.remoteJid
    const usuario = db?.data?.users?.[jidRemitente] || {}
    const registrado = Boolean(usuario.registrado)
    const nombreBot = config.nombreBot || 'FamilyBot-MD'
    const prefijo = config.prefijo || '.'
    const usuarios = Object.keys(db?.data?.users || {}).length
    const memoria = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(0)
    const fecha = new Date().toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })

    const porCategoria = {}
    for (const comando of comandos) {
      if (comando.oculto || (config.comandosDesactivados || []).includes(comando.nombre)) continue
      const categoria = comando.categoria || 'main'
      porCategoria[categoria] ??= []
      porCategoria[categoria].push(comando)
    }

    const lineas = [
      '╭────────────────────────╮',
      `│  ◢  *${nombreBot.toUpperCase()}*  ◣  │`,
      '│    N E U R A L   C O R E    │',
      '╰────────────────────────╯',
      '',
      `◉ *STATUS*  ${registrado ? 'ONLINE · REG' : 'ONLINE · NO REG'}`,
      `⌁ Uptime: ${formatRuntime(process.uptime())}  |  RAM: ${memoria} MB`,
      `◎ Usuarios: ${usuarios}  |  Prefijo: ${prefijo}`,
      `◷ Fecha: ${fecha}`,
      ''
    ]

    for (const categoria of Object.keys(porCategoria).sort()) {
      const icono = ICONOS[categoria.toLowerCase()] || '◇'
      const titulo = recortar(categoria.toUpperCase(), 19)
      lineas.push(`┌─ ${icono} *${titulo}*`)
      lineas.push(`│ ${construirLineaComandos(porCategoria[categoria], prefijo, registrado, categoria)}`)
      lineas.push('└────────────────────────')
    }

    lineas.push('')
    lineas.push(registrado ? `✓ Registrado · ${prefijo}reg` : `! Usa ${prefijo}reg para desbloquear comandos`)
    lineas.push(`⚡ *${nombreBot}* · Cyberpunk System`)
    const menuText = lineas.join('\n')

    let imagen = null
    try {
      imagen = obtenerImagenMenuAleatoria()
    } catch (error) {
      imagen = null
    }

    if (imagen) {
      await sock.sendMessage(chatId, {
        image: imagen,
        caption: menuText
      }, { quoted: msg })
    } else {
      await sock.sendMessage(chatId, {
        text: menuText
      }, { quoted: msg })
    }
  } catch (error) {
    console.error('Error en menu:', error.message)
    await sock.sendMessage(chatId, {
      text: '❌ No se pudo cargar el menú neural.'
    }, { quoted: msg })
  }
}
