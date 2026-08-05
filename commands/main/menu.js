import { obtenerImagenMenuAleatoria } from '../../lib/randomImage.js'

export const desc = 'Muestra este menú de comandos'
export const alias = ['help', 'ayuda', 'menu']
export const cooldown = 5

export default async function menu({ sock, chatId, comandos, config }) {
  const fecha = new Date().toLocaleString('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
  })

  const porCategoria = {}

  for (const c of comandos) {
    const cat = c.categoria || 'main'
    if (!porCategoria[cat]) porCategoria[cat] = []
    porCategoria[cat].push(c)
  }

  const categoriasOrdenadas = Object.keys(porCategoria).sort()

  let lista = ''

  for (const cat of categoriasOrdenadas) {

    const emoji =
      cat.toLowerCase() === 'main' ? '🏠' :
      cat.toLowerCase() === 'descargas' ? '📥' :
      cat.toLowerCase() === 'economia' ? '💰' :
      cat.toLowerCase() === 'grupo' ? '👥' :
      cat.toLowerCase() === 'media' ? '🎬' :
      cat.toLowerCase() === 'owner' ? '👑' :
      '📂'

    lista += `

╭━━〔 ${emoji} ${cat.toUpperCase()} 〕━━⬣
`

    lista += porCategoria[cat]
      .map((c) => {
        const aliases = c.alias?.length
          ? ` (${c.alias.map(a => config.prefijo + a).join(', ')})`
          : ''

        return `┃ ✦ *${config.prefijo}${c.nombre}*${aliases}
┃ 💬 ${c.desc}`
      })
      .join('\n┃\n')

    lista += `
╰━━━━━━━━━━━━━━━━━━⬣`
  }

  const texto = `
╭━━〔🌸🦋 *TheYui-MD* 🌸🦋〕━━⬣
┃ 👑 Owner : AmilcarGit
┃ 📅 ${fecha}
┃ 📚 Comandos : ${comandos.length}
┃ ⚡ Prefijo : ${config.prefijo}
╰━━━━━━━━━━━━━━━━━━⬣

📜 *MENÚ DE COMANDOS*

${lista}

╭━━━━━━━━━━━━━━━━━━⬣
┃ 🌸 Gracias por usar
┃ 🤖 TheYui-MD 🌸🦋
┃ 💜 Powered by AmilcarGit
╰━━━━━━━━━━━━━━━━━━⬣
`

  const imagen = obtenerImagenMenuAleatoria()

  if (imagen) {
    await sock.sendMessage(chatId, { image: imagen, caption: texto.trim() })
  } else {
    await sock.sendMessage(chatId, { text: texto.trim() })
  }
}