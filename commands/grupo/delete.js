export const desc = 'Borra el mensaje citado'
export const alias = ['del', 'borrar']
export const cooldown = 2
export const soloAdmin = true

export default async function del({ sock, msg, chatId }) {
  if (!chatId.endsWith('@g.us')) {
    return sock.sendMessage(chatId, { text: '❌ Este comando solo funciona en grupos.' })
  }

  const contexto = msg.message?.extendedTextMessage?.contextInfo
  const idCitado = contexto?.stanzaId
  const participanteCitado = contexto?.participant

  if (!idCitado || !participanteCitado) {
    return sock.sendMessage(chatId, { text: '❀ Responde al mensaje que quieres borrar.' })
  }

  try {
    await sock.sendMessage(chatId, {
      delete: { remoteJid: chatId, fromMe: false, id: idCitado, participant: participanteCitado },
    })
  } catch (err) {
    await sock.sendMessage(chatId, { text: '❌ No pude borrar ese mensaje.' })
  }
}