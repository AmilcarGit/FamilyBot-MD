export const desc = 'Muestra este menú de comandos'
export const alias = ['help', 'ayuda']
export const cooldown = 5

export default async function menu({ sock, chatId, comandos, config }) {
  const fecha = new Date().toLocaleString('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
  })

  const iconos = {
    main: '🏠',
    descargas: '📥',
    economia: '💰',
    grupo: '👥',
    media: '🎬',
    owner: '👑'
  }

  const porCategoria = {}

  for (const c of comandos) {
    const cat = c.categoria || 'main'
    if (!porCategoria[cat]) porCategoria[cat] = []
    porCategoria[cat].push(c)
  }

  const categoriasOrdenadas = Object.keys(porCategoria).sort()

  let lista = ''

  for (const cat of categoriasOrdenadas) {
    const emoji = iconos[cat.toLowerCase()] || '📂'

    lista += `\n\n${emoji} *${cat.toUpperCase()}*\n`

    lista += porCategoria[cat]
      .map(c => {
        const alias = c.alias?.length
          ? ` _(${c.alias.map(a => config.prefijo + a).join(', ')})_`
          : ''

        return `▢ *${config.prefijo}${c.nombre}*${alias}\n   ${c.desc}`
      })
      .join('\n\n')
  }

  const texto = `
╭━━━〔 🤖 ${config.nombreBot} 〕━━━⬣
┃ 📅 ${fecha}
┃ 📚 Comandos: ${comandos.length}
┃ ⚡ Prefijo: ${config.prefijo}
╰━━━━━━━━━━━━━━━━⬣

📜 *MENÚ DE COMANDOS*${lista}

╭━━━━━━━━━━━━━━━━⬣
┃ 💎 Gracias por usar
┃ 🤖 ${config.nombreBot}
╰━━━━━━━━━━━━━━━━⬣
`

  await sock.sendMessage(chatId, {
    text: texto.trim()
  })
}