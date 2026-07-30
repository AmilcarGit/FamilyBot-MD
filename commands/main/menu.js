export const desc = 'Muestra este menú de comandos'
export const alias = ['help', 'ayuda']
export const cooldown = 5

export default async function menu({ sock, chatId, comandos, config }) {
  const fecha = new Date().toLocaleString('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
  })

  const porCategoria = {}
  for (const c of comandos) {
    const cat = c.categoria || 'general'
    if (!porCategoria[cat]) porCategoria[cat] = []
    porCategoria[cat].push(c)
  }

  const categoriasOrdenadas = Object.keys(porCategoria).sort()

  let lista = ''
  for (const cat of categoriasOrdenadas) {
    lista += `\n\n📂 *${cat.toUpperCase()}*\n`
    lista += porCategoria[cat]
      .map((c) => {
        const alias = c.alias.length
          ? ` _(${c.alias.map((a) => config.prefijo + a).join(', ')})_`
          : ''
        return `▢ *${config.prefijo}${c.nombre}*${alias}\n   ${c.desc}`
      })
      .join('\n\n')
  }

  const texto = `🤖 *${config.nombreBot}*
🕐 ${fecha}

📜 *Comandos disponibles*${lista}`

  await sock.sendMessage(chatId, { text: texto })
}
