import { obtenerUsuario } from '../../lib/economia.js'

export const desc = 'Retira efectivo del banco'
export const cooldown = 3

export default async function retirar({ sock, msg, args, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const eco = await obtenerUsuario(db, jidRemitente)

  const monto = parseInt(args[0], 10)
  if (!monto || monto <= 0 || monto > eco.banco) {
    return sock.sendMessage(chatId, {
      text: `❌ Escribe un monto válido para retirar (tienes ${eco.banco} en el banco).`,
    })
  }

  eco.banco -= monto
  eco.saldo += monto
  await db.write()

  await sock.sendMessage(chatId, { text: `✅ Retiraste ${monto} del banco.` })
}