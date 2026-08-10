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

  usuarios.forEach((u, i) => {
    const medalla = medallas[i] || `${i + 1}.`
    texto += `${medalla} @${u.jid.split('@')[0]} — ${u.total}\n`
  })

  await sock.sendMessage(chatId, {
    text: texto,
    mentions: usuarios.map((u) => u.jid),
  })
}