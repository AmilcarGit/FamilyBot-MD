import { obtenerUsuario } from '../../lib/economia.js'

export const desc = 'Juega a la ruleta apostando a un color'
export const cooldown = 3

export default async function ruleta({ sock, msg, args, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const eco = await obtenerUsuario(db, jidRemitente)

  const color = args[0]?.toLowerCase()
  const monto = parseInt(args[1], 10)
  const multiplicadores = { rojo: 2, negro: 2, verde: 14 }

  if (!multiplicadores[color]) {
    return sock.sendMessage(chatId, {
      text: '🎰 Elige un color: rojo, negro o verde.\nEjemplo: ruleta rojo 100',
    })
  }

  if (!monto || monto <= 0 || monto > eco.saldo) {
    return sock.sendMessage(chatId, {
      text: `❌ Escribe un monto válido para apostar (tienes ${eco.saldo} en efectivo).`,
    })
  }

  const numero = Math.floor(Math.random() * 37)
  const resultado = numero === 0 ? 'verde' : numero % 2 === 0 ? 'negro' : 'rojo'

  if (resultado === color) {
    const premio = monto * multiplicadores[color] - monto
    eco.saldo += premio
    await db.write()

    return sock.sendMessage(chatId, {
      text: `🎰 Salió *${numero} (${resultado})*.\n🎉 Ganaste ${premio} de efectivo.`,
    })
  }

  eco.saldo -= monto
  await db.write()

  await sock.sendMessage(chatId, {
    text: `🎰 Salió *${numero} (${resultado})*.\n😢 Perdiste ${monto}.`,
  })
}