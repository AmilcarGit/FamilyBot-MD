import { normalizarJid } from '../../lib/utils.js'

export const desc = 'Mina monedas para aumentar tu saldo.'
export const alias = ['mine']
export const cooldown = 300 // 5 minutos de cooldown

async function obtenerUsuario(db, jid) {
  const jidNormalizado = normalizarJid(jid)
  db.data.users[jidNormalizado] ??= { mensajes: 0 }
  db.data.users[jidNormalizado].economia ??= { saldo: 0, banco: 0 }
  return db.data.users[jidNormalizado].economia
}

export default async function minar({ sock, msg, chatId, db, t }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const eco = await obtenerUsuario(db, jidRemitente)

  const recompensa = Math.floor(Math.random() * (500 - 100 + 1)) + 100
  eco.saldo += recompensa
  await db.write()

  const mensaje = `⛏️ *¡Has minado con éxito!*\n\nGanaste: *${recompensa}* monedas.\nTu saldo actual es: *${eco.saldo}*`
  
  await sock.sendMessage(chatId, { text: mensaje })
}
