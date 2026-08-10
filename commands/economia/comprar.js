import { obtenerUsuario, TIENDA } from '../../lib/economia.js'

export const desc = 'Compra un item de la tienda'
export const cooldown = 3

export default async function comprar({ sock, msg, args, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const eco = await obtenerUsuario(db, jidRemitente)

  const idItem = args[0]?.toLowerCase()
  const item = TIENDA[idItem]

  if (!item) {
    return sock.sendMessage(chatId, {
      text: `❀ Ese item no existe. Usa *tienda* para ver la lista.`,
    })
  }

  if (eco.saldo < item.precio) {
    return sock.sendMessage(chatId, {
      text: `❌ No tienes suficiente efectivo (tienes ${eco.saldo}, necesitas ${item.precio}).`,
    })
  }

  eco.saldo -= item.precio

  if (idItem === 'escudo') {
    eco.escudoHasta = Date.now() + 24 * 60 * 60 * 1000
  } else if (idItem === 'amuleto') {
    eco.amuletoActivo = true
  } else if (idItem === 'multiplicador') {
    eco.multiplicadorActivo = true
  }

  await db.write()

  await sock.sendMessage(chatId, {
    text: `✅ Compraste ${item.nombre}.`,
  })
}