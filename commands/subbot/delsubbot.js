import { detenerSubbot, listarSubbots } from '../../subbots/manager.js'

export const desc = 'Desvincula un subbot'
export const alias = ['unsubbot']
export const cooldown = 5

export default async function delsubbot({ sock, msg, args, chatId, esDueno }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const numero = args[0]?.replace(/\D/g, '')

  if (!numero) {
    return sock.sendMessage(chatId, { text: '❀ Escribe el número del subbot que quieres desvincular.' })
  }

  const activos = listarSubbots()
  const entrada = activos.find((s) => s.numero === numero)

  if (!entrada) {
    return sock.sendMessage(chatId, { text: '❌ No encontré un subbot activo con ese número.' })
  }

  if (!esDueno && entrada.creadorJid !== jidRemitente) {
    return sock.sendMessage(chatId, { text: '❌ Solo quien vinculó ese subbot (o el owner) puede desvincularlo.' })
  }

  await detenerSubbot(numero)
  await sock.sendMessage(chatId, { text: `✅ Subbot *${numero}* desvinculado.` })
}