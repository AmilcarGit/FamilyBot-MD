import { TIENDA } from '../../lib/economia.js'

export const desc = 'Muestra la tienda de items'
export const cooldown = 3

export default async function tienda({ sock, chatId }) {
  let texto = '🏪 *Tienda*\n\n'

  for (const [id, item] of Object.entries(TIENDA)) {
    texto += `${item.nombre} — ${item.precio}\n💬 ${item.desc}\n🔑 comprar ${id}\n\n`
  }

  await sock.sendMessage(chatId, { text: texto.trim() })
}