export const desc = 'Muestra estado, RAM y estadísticas del bot'
export const alias = ['estado', 'uptime']
export const soloOwner = true
export const cooldown = 3

function formatearBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatearUptime(segundos) {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = Math.floor(segundos % 60)
  return `${h}h ${m}m ${s}s`
}

export default async function status({ sock, chatId, db, comandos }) {
  const memoria = process.memoryUsage()
  const totalUsuarios = Object.keys(db.data.users || {}).length
  const totalChats = Object.keys(db.data.chats || {}).length
  const comandosEjecutados = db.data.stats?.comandosEjecutados || 0

  await sock.sendMessage(chatId, {
    text:
      `📊 *Estado del bot*\n\n` +
      `⏱️ Uptime: ${formatearUptime(process.uptime())}\n` +
      `🧠 RAM usada: ${formatearBytes(memoria.rss)}\n` +
      `📦 Heap: ${formatearBytes(memoria.heapUsed)} / ${formatearBytes(memoria.heapTotal)}\n` +
      `⚙️ Node: ${process.version}\n\n` +
      `📚 Comandos cargados: ${comandos.length}\n` +
      `⚡ Comandos ejecutados: ${comandosEjecutados}\n` +
      `👤 Usuarios registrados: ${totalUsuarios}\n` +
      `👥 Chats conocidos: ${totalChats}`,
  })
}