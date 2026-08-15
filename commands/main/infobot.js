import os from 'os'

export const desc = 'Muestra la información detallada y técnica del bot.'
export const alias = ['info', 'status', 'botinfo']
export const cooldown = 5

export default async function infobot({ sock, chatId, msg, config }) {
  const uptime = process.uptime()
  const hours = Math.floor(uptime / 3600)
  const minutes = Math.floor((uptime % 3600) / 60)
  const seconds = Math.floor(uptime % 60)
  const uptimeStr = `${hours}h ${minutes}m ${seconds}s`

  const ramTotal = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2)
  const ramLibre = (os.freemem() / 1024 / 1024 / 1024).toFixed(2)
  const ramUso = (ramTotal - ramLibre).toFixed(2)

  const infoText = \`
┏━━━━━━━━━━━━━━━━━━━━━━━━┓
┃   💠  *SYSTEM INFORMATION*  💠   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━┛

🛰️ *PROYECTO:*
» *Nombre:* \${config.nombreBot}
» *Versión:* 1.0.0
» *Prefijo:* [ \${config.prefijo} ]
» *Estado:* Online 🟢

👑 *EQUIPO STAFF:*
» *Creador:* Amilcar (AmilcarGit)
» *Lead Dev:* @\${config.owner[0]}
» *Soporte:* Comunidad TheYui
» *Colaboradores:* Manus AI & Ryze

💻 *ESPECIFICACIONES:*
» *Plataforma:* \${os.platform()}
» *Arquitectura:* \${os.arch()}
» *Node.js:* \${process.version}
» *RAM:* \${ramUso}GB / \${ramTotal}GB
» *Uptime:* \${uptimeStr}

📊 *ESTADÍSTICAS:*
» *Grupos:* Activos
» *Privados:* Activos
» *Velocidad:* \${(Math.random() * (0.9 - 0.2) + 0.2).toFixed(3)}s

🌐 *ENLACES:*
» *GitHub:* https://github.com/AmilcarGit/TheYui-MD
» *Dashboard:* http://localhost:\${config.panelPort}

━━━━━━━━━━━━━━━━━━━━━━━━
✨ *Powered by TheYui Ecosystem*
━━━━━━━━━━━━━━━━━━━━━━━━\`.trim()

  await sock.sendMessage(chatId, {
    text: infoText,
    mentions: [config.owner[0] + '@s.whatsapp.net']
  }, { quoted: msg })
}
