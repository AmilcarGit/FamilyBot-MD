import { normalizarJid } from '../../lib/utils.js'

export const desc = 'Sistema de economía. Subcomandos: saldo, depositar, retirar'
export const alias = ['eco']
export const cooldown = 3

async function obtenerUsuario(db, jid) {
  const jidNormalizado = normalizarJid(jid)
  db.data.users[jidNormalizado] ??= { mensajes: 0 }
  db.data.users[jidNormalizado].economia ??= { saldo: 0, banco: 0 }
  await db.write()
  return db.data.users[jidNormalizado].economia
}

async function saldo({ sock, msg, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const eco = await obtenerUsuario(db, jidRemitente)

  await sock.sendMessage(chatId, {
    text: `💰 *Tu economía*\n\n💵 Efectivo: ${eco.saldo}\n🏦 Banco: ${eco.banco}`,
  })
}

async function depositar({ sock, msg, args, chatId, db }) {
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

async function retirar({ sock, msg, args, chatId, db }) {
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

export const subcomandos = { saldo, depositar, retirar }

export default async function economia({ sock, chatId, config }) {
  await sock.sendMessage(chatId, {
    text:
      `💰 *Sistema de economía*\n\n` +
      `Uso: *${config.prefijo}economia <subcomando>*\n\n` +
      `▢ saldo\n▢ depositar <monto>\n▢ retirar <monto>`,
  })
}