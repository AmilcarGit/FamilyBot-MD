export const desc = 'Muestra información del grupo'
export const alias = ['groupinfo']
export const cooldown = 5

export default async function infogrupo({ sock, chatId }) {
  if (!chatId.endsWith('@g.us')) {
    return sock.sendMessage(chatId, { text: '❌ Este comando solo funciona en grupos.' })
  }

  const metadata = await sock.groupMetadata(chatId)
  const admins = metadata.participants.filter((p) => p.admin === 'admin' || p.admin === 'superadmin')

  const texto =
    `📋 *Información del grupo*\n\n` +
    `📛 Nombre: ${metadata.subject}\n` +
    `🆔 ID: ${metadata.id}\n` +
    `👥 Miembros: ${metadata.participants.length}\n` +
    `👑 Administradores: ${admins.length}\n` +
    `📅 Creado: ${new Date(metadata.creation * 1000).toLocaleDateString('es-PE')}\n` +
    `📝 Descripción: ${metadata.desc || 'Sin descripción'}`

  await sock.sendMessage(chatId, { text: texto })
}