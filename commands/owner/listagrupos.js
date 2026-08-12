export const desc = 'Lista todos los grupos donde está el bot'
export const alias = ['listgroups']
export const soloOwner = true
export const cooldown = 5

export default async function listagrupos({ sock, chatId }) {
  try {
    const grupos = await sock.groupFetchAllParticipating()
    const entradas = Object.values(grupos)

    if (!entradas.length) {
      return sock.sendMessage(chatId, { text: '❌ El bot no está en ningún grupo.' })
    }

    const texto = entradas
      .map((g, i) => `${i + 1}. *${g.subject}*\n   👥 ${g.participants.length} miembros\n   🆔 ${g.id}`)
      .join('\n\n')

    await sock.sendMessage(chatId, { text: `📋 *Grupos (${entradas.length})*\n\n${texto}` })
  } catch (err) {
    console.log('❌ Error listando grupos:', err.message)
    await sock.sendMessage(chatId, { text: '❌ No pude obtener la lista de grupos.' })
  }
}