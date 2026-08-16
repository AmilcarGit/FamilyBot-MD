import { obtenerResumenPanel } from '../../lib/panel.js'

export const desc = 'Muestra un resumen de lo que está pasando en el panel web'
export const alias = ['panelinfo', 'verpanel']
export const soloOwner = true
export const cooldown = 5

function formatearUptime(segundos) {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default async function panel({ sock, msg, chatId, db, config }) {
  const resumen = obtenerResumenPanel()
  const stats = db.data.stats || {}
  const mensajesHoy = (stats.mensajesPorHora || []).reduce((a, b) => a + b, 0)
  const grupos = Object.keys(db.data.chats || {}).filter((c) => c.endsWith('@g.us')).length
  const usuarios = Object.keys(db.data.users || {}).length

  const topComandos = Object.entries(stats.comandosPorNombre || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([nombre, usos]) => `   • .${nombre} — ${usos} usos`)
    .join('\n') || '   • Sin datos todavía'

  let texto =
    `🦋 *Panel de TheYui-MD*\n\n` +
    `⏱️ Uptime: ${formatearUptime(process.uptime())}\n` +
    `💾 RAM: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(1)} MB\n` +
    `👥 Usuarios: ${usuarios}\n` +
    `🏘️ Grupos: ${grupos}\n` +
    `💬 Mensajes hoy: ${mensajesHoy}\n` +
    `🧩 Comandos ejecutados (total): ${stats.comandosEjecutados || 0}\n\n` +
    `🏆 *Top comandos*\n${topComandos}\n\n` +
    `🚨 *Alertas*\n` +
    `   • Errores Bad MAC: ${resumen.badMacCount}\n` +
    `   • Último Bad MAC: ${resumen.ultimoBadMac || 'Ninguno registrado'}\n`

  const esPrivado = !chatId.endsWith('@g.us')

  if (esPrivado && resumen.panelActivo) {
    texto += `\n🌐 *Acceso al panel*\n   • http://localhost:${resumen.panelPort}\n   • Token: ${resumen.token}`
  } else if (!resumen.panelActivo) {
    texto += `\n⚠️ El panel está desactivado (panelActivo: false en config.js)`
  } else {
    texto += `\n🔒 El link y token del panel solo se muestran en privado, por seguridad.`
  }

  await sock.sendMessage(chatId, { text: texto })
}
