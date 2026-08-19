import { leerDeCache, intentarCapturar, agregarAMochila } from '../../lib/pokedexJuego.js'

export const desc = 'Intenta atrapar el último Pokémon consultado (uso interno, vía botón)'
export const oculto = true
export const cooldown = 3

export default async function pokeatrapar({ sock, chatId, args, msg, db }) {
  const id = args[0]
  const jidRemitente = msg.key.participant || msg.key.remoteJid

  if (!id) {
    return sock.sendMessage(chatId, {
      text: '❌ Primero consulta un Pokémon con *pokedex* antes de intentar atraparlo.',
    })
  }

  const datos = leerDeCache(id)
  if (!datos) {
    return sock.sendMessage(chatId, {
      text: '⏳ Esa consulta ya expiró. Vuelve a buscar el Pokémon con *pokedex* antes de intentar atraparlo de nuevo.',
    })
  }

  const { exito, probabilidad } = intentarCapturar(datos.statsTotal)

  if (!exito) {
    return sock.sendMessage(chatId, {
      text: `💨 *${datos.nombre}* escapó... (probabilidad de captura: ${probabilidad}%)\n\nInténtalo de nuevo.`,
    })
  }

  const resultado = await agregarAMochila(db, jidRemitente, { id, nombre: datos.nombre, tipos: datos.tipos })

  await sock.sendMessage(chatId, {
    text: `🎉 ¡Atrapaste a *${datos.nombre}*!\n\n🎒 Ahora tienes ${resultado.cantidad} en tu mochila.`,
  })
}
