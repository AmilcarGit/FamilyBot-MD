import { resolverNumeroReal } from '../../lib/utils.js'

export const desc = 'Muestra el top 10 de economía'
export const cooldown = 5

export default async function top({ sock, chatId, db }) {
  const usuarios = Object.entries(db.data.users)
    .filter(([, u]) => u.economia)
    .map(([jid, u]) => ({ jid, total: (u.economia.saldo || 0) + (u.economia.banco || 0) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  if (!usuarios.length) {
    return sock.sendMessage(chatId, { text: '❌ Todavía no hay nadie con economía registrada.' })
  }

  const medallas = ['🥇', '🥈', '🥉']
  let texto = '🏆 *Top economía*\n\n'

  for (let i = 0; i < usuarios.length; i++) {
    const u = usuarios[i]
    const medalla = medallas[i] || `${i + 1}.`
    const numero = await resolverNumeroReal(sock, u.jid)
    texto += `${medalla} @${numero} — ${u.total}\n`
  }

  await sock.sendMessage(chatId, {
    text: texto,
    mentions: usuarios.map((u) => u.jid),
  })
}