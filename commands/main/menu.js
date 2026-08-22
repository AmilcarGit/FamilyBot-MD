import { obtenerImagenMenuAleatoria } from '../../lib/randomImage.js'

export const desc = 'Muestra el menú Cyberpunk de FamilyBot-MD'
export const alias = ['help', 'ayuda', 'menu']
export const categoria = 'main'
export const cooldown = 5

const ESTILO = {
  main: ['◈', 'ＭＡＩＮ'],
  descargas: ['📡', 'ＤＥＳＣＡＲＧＡＳ'],
  economia: ['💰', 'ＥＣＯＮＯＭＩＡ'],
  gacha: ['🎴', 'ＧＡＣＨＡ'],
  anime: ['🌸', 'ＡＮＩＭＥ'],
  grupo: ['🛡️', 'ＧＲＵＰＯ'],
  media: ['🎞️', 'ＭＥＤＩＡ'],
  owner: ['👑', 'ＯＷＮＥＲ'],
  social: ['💞', 'ＳＯＣＩＡＬ'],
  juegos: ['🎮', 'ＪＵＥＧＯＳ'],
  perfil: ['🪪', 'ＰＥＲＦＩＬ'],
  subbot: ['🤖', 'ＳＵＢＢＯＴ'],
  herramientas: ['🧰', 'ＨＥＲＲＡＭＩＥＮＴＡＳ'],
  ia: ['🧠', 'ＩＮＴＥＬＩＧＥＮＣＩＡ'],
  premium: ['💎', 'ＰＲＥＭＩＵＭ']
}

function formatRuntime(seconds) {
  const horas = Math.floor(seconds / 3600)
  const minutos = Math.floor((seconds % 3600) / 60)
  return `${horas}h ${minutos}m`
}

function limpiar(texto) {
  return String(texto || '').replace(/[\n\r]+/g, ' ').trim()
}

function recortar(texto, limite) {
  const valor = limpiar(texto)
  return valor.length > limite ? `${valor.slice(0, limite - 1)}…` : valor
}

function construirBloqueComando(comando, prefijo, registrado, categoria) {
  const requiereRegistro = !['main', 'owner'].includes(categoria.toLowerCase())
  const bloqueo = requiereRegistro && !registrado ? ' 🔒' : ''
  const principal = `*${prefijo}${comando.nombre}${bloqueo}*`
  const alias = Array.isArray(comando.alias) && comando.alias.length
    ? ` · Alias: ${comando.alias.map(item => `*${prefijo}${item}*`).join(' · ')}`
    : ''
  const descripcion = recortar(comando.desc || 'Sin descripción disponible', 48)
  return [`│ ✦ ${principal}${alias}`, `│   ↳ _${descripcion}_`, '│']
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
      '╭━━━〔 ⚡ 𝙁𝘼𝙈𝙄𝙇𝙔𝘽𝙊𝙏-𝙈𝘿 ⚡ 〕━━━╮',
      '┃       ⟡ 𝙉𝙀𝙐𝙍𝘼𝙇 𝘾𝙔𝘽𝙀𝙍 𝙎𝙔𝙎𝙏𝙀𝙈 ⟡',
      '╰━━━━━━━━━━━━━━━━━━━━━━━━╯',
      '',
      '╭─「 📡 𝙎𝙏𝘼𝙏𝙐𝙎 」',
      `│ ${registrado ? '🟢 ＲＥＧ' : '🟡 ＮＯ ＲＥＧ'} · ＯＮＬＩＮＥ`,
      `│ ⏱️ ${formatRuntime(process.uptime())}  •  🧠 ${memoria} MB`,
      `│ 👥 ${usuarios}  •  ⚙️ ${prefijo}`,
      `│ 📅 ${fecha}`,
      '╰──────────────────────────',
      ''
    ]

    for (const categoria of Object.keys(porCategoria).sort()) {
      const [icono, tituloBase] = ESTILO[categoria.toLowerCase()] || ['◇', recortar(categoria.toUpperCase(), 20)]
      lineas.push(`╭─「 ${icono} ${tituloBase} 」`)
      for (const comando of porCategoria[categoria]) {
        lineas.push(...construirBloqueComando(comando, prefijo, registrado, categoria))
      }
      lineas.push('╰──────────────────────────')
    }

    lineas.push('')
    lineas.push(registrado ? `✅ ＲＥＧＩＳＴＲＡＤＯ · ${prefijo}reg` : `🔐 ＵＳＡ ${prefijo}reg · ＡＣＣＥＳＯ`)
    lineas.push(`✦ ${nombreBot} · 𝘾𝙔𝘽𝙀𝙍𝙋𝙐𝙉𝙆 ✦`)
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
      text: '❌ Error al generar el menú Cyberpunk.'
    }, { quoted: msg })
  }
}
