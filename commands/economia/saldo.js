import { obtenerUsuario } from '../../lib/economia.js'

export const desc = 'Muestra tu saldo de economía'
export const cooldown = 3

export default async function saldo({ sock, msg, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const eco = await obtenerUsuario(db, jidRemitente)

  await sock.sendMessage(chatId, {
    text: `💰 *Tu economía*\n\n💵 Efectivo: ${eco.saldo}\n🏦 Banco: ${eco.banco}`,
  })
}