export const desc = 'Reporta un error o problema al equipo de staff'
export const alias = ['report', 'bug']
export const cooldown = 60

export default async function reporte({ sock, msg, args, chatId, config }) {
  const texto = args.join(' ').trim()

  if (!texto) {
    return sock.sendMessage(chatId, {
      text: '❀ Escribe qué problema encontraste.\nEjemplo: reporte El comando .video no descarga nada',
    })
  }

  const staff = config.staff || []

  if (!staff.length) {
    return sock.sendMessage(chatId, {
      text: '❌ Todavía no hay staff configurado para recibir reportes.',
    })
  }

  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const numero = jidRemitente.split('@')[0]
  const esGrupo = chatId.endsWith('@g.us')
  const fecha = new Date().toLocaleString('es-PE')

  let nombreChat = esGrupo ? 'Grupo' : 'Privado'
  if (esGrupo) {
    try {
      const metadata = await sock.groupMetadata(chatId)
      nombreChat = `Grupo: ${metadata.subject}`
    } catch {}
  }

  const mensajeReporte =
    `🚨 *Nuevo reporte*\n\n` +
    `👤 De: @${numero}\n` +
    `💬 Chat: ${nombreChat}\n` +
    `📅 Fecha: ${fecha}\n\n` +
    `📝 Reporte:\n${texto}`

  let enviados = 0

  for (const numeroStaff of staff) {
    try {
      const jidStaff = `${numeroStaff}@s.whatsapp.net`
      await sock.sendMessage(jidStaff, { text: mensajeReporte, mentions: [jidRemitente] })
      enviados++
    } catch {}
  }

  await sock.sendMessage(chatId, {
    text:
      enviados > 0
        ? `✅ Tu reporte fue enviado al equipo de staff.`
        : `❌ No se pudo enviar el reporte a nadie del staff, intenta más tarde.`,
  })
}