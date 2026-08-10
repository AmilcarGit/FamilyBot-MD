import { obtenerUsuario } from '../../lib/economia.js'

export const desc = 'Juega a las tragamonedas'
export const cooldown = 3

export default async function tragamonedas({ sock, msg, args, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const eco = await obtenerUsuario(db, jidRemitente)

  const monto = parseInt(args[0], 10)
  if (!monto || monto <= 0 || monto > eco.saldo) {
    return sock.sendMessage(chatId, {
      text: `❌ Escribe un monto válido para jugar (tienes ${eco.saldo} en efectivo).`,
    })
  }

  const simbolos = ['🍒', '🍋', '🍇', '⭐', '💎']
  const tirada = [0, 0, 0].map(() => simbolos[Math.floor(Math.random() * simbolos.length)])
  const [a, b, c] = tirada

  let premio = 0
  if (a === b && b === c) premio = monto * 10
  else if (a === b || b === c || a === c) premio = monto * 2

  eco.saldo += premio - monto
  await db.write()

  const resultado = premio > 0 ? `🎉 Ganaste ${premio - monto} de efectivo.` : `😢 Perdiste ${monto}.`

  await sock.sendMessage(chatId, {
    text: `🎰 [ ${tirada.join(' | ')} ]\n\n${resultado}`,
  })
}