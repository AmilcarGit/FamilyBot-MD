import { obtenerUsuario } from '../../lib/economia.js'

export const desc = 'Deposita efectivo en el banco'
export const cooldown = 3

export default async function depositar({ sock, msg, args, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const eco = await obtenerUsuario(db, jidRemitente)

  const monto = parseInt(args[0], 10)
  if (!monto || monto <= 0 || monto > eco.saldo) {
    return sock.sendMessage(chatId, {
      text: `❌ Escribe un monto válido para depositar (tienes ${eco.saldo} en efectivo).`,
    })
  }

  eco.saldo -= monto
  eco.banco += monto
  await db.write()

  await sock.sendMessage(chatId, { text: `✅ Depositaste ${monto} en el banco.` })
}