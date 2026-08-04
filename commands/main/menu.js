export const desc = 'Muestra este menú de comandos'
export const alias = ['help', 'ayuda', 'menu']
export const cooldown = 5

export default async function menu({ sock, chatId, comandos, config }) {
  const fecha = new Date().toLocaleDateString('es-PE')
  const hora = new Date().toLocaleTimeString('es-PE')

  const iconos = {
    main: '🏠',
    descargas: '📥',
    economia: '💰',
    grupo: '👥',
    media: '🎬',
    owner: '👑'
  }

  const categorias = {}

  for (const cmd of comandos) {
    const cat = cmd.categoria || 'main'
    if (!categorias[cat]) categorias[cat] = []
    categorias[cat].push(cmd)
  }

  let menu = `
╭━━━〔 🌸🦋 *TheYui-MD* 🌸🦋 〕━━━⬣
┃ 👑 Owner : AmilcarGit
┃ ⚡ Versión : 1.0.0
┃ 📚 Comandos : ${comandos.length}
┃ 📅 Fecha : ${fecha}
┃ 🕒 Hora : ${hora}
┃ 🔰 Prefijo : MULTIPREFIJO
╰━━━━━━━━━━━━━━━━━━⬣
`

  for (const cat of Object.keys(categorias).sort()) {
    const emoji = iconos[cat.toLowerCase()] || '📂'

    menu += `

╭━━〔 ${emoji} ${cat.toUpperCase()} 〕━━⬣
`

    for (const cmd of categorias[cat]) {
      menu += `┃ ✦ ${config.prefijo}${cmd.nombre}\n`
    }

    menu += `╰━━━━━━━━━━━━━━━━━━⬣`
  }

  menu += `

╭━━━━━━━━━━━━━━━━━━⬣
┃ 🌸 Gracias por usar
┃ 🤖 TheYui-MD 🌸🦋
┃ 💜 Powered by AmilcarGit
╰━━━━━━━━━━━━━━━━━━⬣`

  await sock.sendMessage(chatId, {
    text: menu.trim()
  })
}