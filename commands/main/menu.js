import { obtenerImagenMenuAleatoria } from '../../lib/randomImage.js'

export const desc = 'Muestra este menú de comandos'
export const alias = ['help', 'ayuda', 'menu']
export const cooldown = 5

const ICONOS_CATEGORIA = {
  main: '🏠',
  descargas: '📥',
  economia: '💰',
  grupo: '🍃',
  media: '🎬',
  owner: '👑',
  social: '🦋',
  juegos: '🫧',
  perfil: '🌸',
  subbot: '🤖',
  herramientas: '🛠️',
  ia: '🤖',
}

const ADORNOS = ['🌾', '🍃', '🫧', '🦋']

function lineaAdornada() {
  return ADORNOS.join(' ✦ ')
}

export default async function menu({ sock, chatId, comandos, config }) {
  try {
    const fecha = new Date().toLocaleString('es-PE', {
      dateStyle: 'short',
      timeStyle: 'short',
    })

    const porCategoria = {}

    for (const c of comandos) {
      if (c.oculto) continue
      if ((config.comandosDesactivados || []).includes(c.nombre)) continue
      const cat = c.categoria || 'main'
      if (!porCategoria[cat]) porCategoria[cat] = []
      porCategoria[cat].push(c)
    }

    const categoriasOrdenadas = Object.keys(porCategoria).sort()

    let lista = ''

    categoriasOrdenadas.forEach((cat, indice) => {
      const emoji = ICONOS_CATEGORIA[cat.toLowerCase()] || '📂'
      const adorno = ADORNOS[indice % ADORNOS.length]

      lista += `\n\n╭─❀ ${adorno} 〔 ${emoji} *${cat.toUpperCase()}* 〕${adorno} ❀─╮\n`

      lista += porCategoria[cat]
        .map((c) => {
          const aliases = c.alias?.length
            ? ` (${c.alias.map((a) => config.prefijo + a).join(', ')})`
            : ''

          const requiereReg = cat.toLowerCase() !== 'main' && cat.toLowerCase() !== 'owner'
          const etiqueta = requiereReg ? ' 🔒' : ''

          return `┃ ✧ *${config.prefijo}${c.nombre}*${aliases}${etiqueta}\n┃   🌾 ${c.desc}`
        })
        .join('\n┃\n')

      lista += `\n╰${'─'.repeat(30)}╯`
    })

    const texto = `
╭❀━━━━━━━━━━━━━━━━━━━❀╮
   ${lineaAdornada()}
   🌈 *${config.nombreBot || 'TheYui-MD'}* 🦋
   ${lineaAdornada()}
╰❀━━━━━━━━━━━━━━━━━━━❀╯

┃ 👑 Creador  : AmilcarGit
┃ 📅 Fecha  : ${fecha}
┃ 📚 Comandos : ${comandos.filter((c) => !c.oculto && !(config.comandosDesactivados || []).includes(c.nombre)).length}
┃ ⚡ Prefijo  : ${config.prefijo}

📜 *MENÚ DE COMANDOS*
🔒 = requiere estar registrado (${config.prefijo}reg Nombre.Edad)
${lista}

╭❀━━━━━━━━━━━━━━━━━━❀╮
   🌾 Gracias por usar 🍃
   🫧 *TheYui-MD* 🦋
   💜 Powered by AmilcarGit
╰❀━━━━━━━━━━━━━━━━━━❀╯
`

    let imagen = null
    try {
      imagen = obtenerImagenMenuAleatoria()
    } catch (e) {
      console.error('Error al obtener imagen del menú:', e)
    }

    if (imagen) {
      await sock.sendMessage(chatId, { image: imagen, caption: texto.trim() })
    } else {
      await sock.sendMessage(chatId, { text: texto.trim() })
    }
  } catch (error) {
    console.error('Error en comando menu:', error)
    await sock.sendMessage(chatId, { text: '❌ Ocurrió un error al generar el menú.' })
  }
}
