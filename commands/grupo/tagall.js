export const desc = 'Menciona a todos los miembros del grupo'
export const alias = ['hidetag']
export const cooldown = 5
export const soloAdmin = true

export default async function tagall({ sock, chatId, args }) {
  if (!chatId.endsWith('@g.us')) {
    return sock.sendMessage(chatId, { text: '❌ Este comando solo funciona en grupos.' })
  }

  const metadata = await sock.groupMetadata(chatId)
  const participantes = metadata.participants.map((p) => p.id)
  const mensajeExtra = args.join(' ').trim()

  const texto = mensajeExtra || `📢 Mención general (${participantes.length} miembros)`

  await sock.sendMessage(chatId, { text: texto, mentions: participantes })
}
