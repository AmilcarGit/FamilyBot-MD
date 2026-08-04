export const desc = 'Muestra el menú de comandos'
export const alias = ['help', 'ayuda', 'menu']
export const cooldown = 5

export default async function menu({ sock, chatId, comandos, config }) {
  const fecha = new Date().toLocaleString('es-PE', {
    dateStyle: 'full',
    timeStyle: 'short'
  })

  const categorias = {}

  for (const cmd of comandos) {
    const cat = cmd.categoria || 'General'
    if (!categorias[cat]) categorias[cat] = []
    categorias[cat].push(cmd)
  }

  const orden = Object.keys(categorias).sort()

  let menu = `
╭━━━〔 🤖 ${config.nombreBot} 〕━━━⬣
┃ 👑 Creador : ${config.owner || "AmilcarGit"}
┃ 📅 ${fecha}
┃ 📚 Comandos : ${comandos.length}
┃ ⚡ Prefijo : ${config.prefijo}
╰━━━━━━━━━━━━━━━━⬣
`

  for (const categoria of orden) {
    menu += `

╭─❖「 ${categoria.toUpperCase()} 」
`

    for (const cmd of categorias[categoria]) {
      const aliases = cmd.alias?.length
        ? `\n│ ➜ Alias: ${cmd.alias.map(a => config.prefijo + a).join(", ")}`
        : ""

      menu += `│
│ ✦ ${config.prefijo}${cmd.nombre}
│ 📖 ${cmd.desc}${aliases}
│
`
    }

    menu += `╰────────────⬣`
  }

  menu += `

╭━━━━━━━━━━━━━━━━⬣
┃ 💎 Gracias por usar
┃ 🤖 ${config.nombreBot}
╰━━━━━━━━━━━━━━━━⬣
`

  await sock.sendMessage(chatId, {
    text: menu.trim()
  })
}