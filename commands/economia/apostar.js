import { obtenerUsuario } from '../../lib/economia.js'

export const desc = 'Apuesta contra el bot lanzando dados'
export const cooldown = 3

export default async function apostar({ sock, msg, args, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const eco = await obtenerUsuario(db, jidRemitente)

  const monto = parseInt(args[0], 10)
  if (!monto || monto <= 0 || monto > eco.saldo) {
    return sock.sendMessage(chatId, {
      text: `❌ Escribe un monto válido para apostar (tienes ${eco.saldo} en efectivo).`,
    })
  }

  const dadoUsuario = Math.floor(Math.random() * 6) + 1
  const dadoBot = Math.floor(Math.random() * 6) + 1

  let resultado
  if (dadoUsuario > dadoBot) {
    eco.saldo += monto
    resultado = `🎉 Ganaste ${monto} de efectivo.`
  } else if (dadoUsuario < dadoBot) {
    eco.saldo -= monto
    resultado = `😢 Perdiste ${monto} de efectivo.`
  } else {
    resultado = `🤝 Empate, recuperas tu apuesta.`
  }

  await db.write()

  await sock.sendMessage(chatId, {
    text: `🎲 Tu dado: ${dadoUsuario} | Dado del bot: ${dadoBot}\n\n${resultado}`,
  })
}