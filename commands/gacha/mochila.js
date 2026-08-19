import { obtenerMochila } from '../../lib/pokedexJuego.js'

export const desc = 'Muestra los Pokémon que has capturado'
export const alias = ['mibolsa', 'pokemochila']
export const cooldown = 5

export default async function mochila({ sock, chatId, msg, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const mochilaUsuario = obtenerMochila(db, jidRemitente)

  const entradas = Object.entries(mochilaUsuario)

  if (!entradas.length) {
    return sock.sendMessage(chatId, {
      text: '🎒 Tu mochila está vacía.\n\nUsa *pokedex <nombre>* y presiona 🎯 Atrapar para empezar a coleccionar.',
    })
  }

  const lista = entradas
    .sort((a, b) => b[1].cantidad - a[1].cantidad)
    .map(([id, p]) => `#${id} — *${p.nombre}* (${p.tipos}) ×${p.cantidad}`)
    .join('\n')

  await sock.sendMessage(chatId, {
    text: `🎒 *Tu mochila* (${entradas.length} especies distintas)\n\n${lista}`,
  })
}
