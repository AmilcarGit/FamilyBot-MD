import axios from 'axios'

export const desc = 'Busca información detallada de un Pokémon con botones interactivos'
export const alias = ['poke', 'pokemon']

export default async function pokedex({ sock, chatId, args, config }) {
  if (!args[0]) return sock.sendMessage(chatId, { text: `❌ Por favor, ingresa el nombre o número de un Pokémon.\nEjemplo: ${config.prefijo}pokedex charizard` })

  const pokemon = args[0].toLowerCase()
  
  try {
    const { data } = await axios.get(`https://pokeapi.co/api/v2/pokemon/${pokemon}`)
    
    const stats = data.stats.map(s => `📊 *${s.stat.name.toUpperCase()}:* ${s.base_stat}`).join('\n')
    const tipos = data.types.map(t => t.type.name.toUpperCase()).join(', ')
    const habilidades = data.abilities.map(a => a.ability.name).join(', ')
    
    const texto = `🌌 *THE YUI-MD: POKEDEX NEURAL* 🌌\n\n` +
                  `🆔 *ID:* ${data.id}\n` +
                  `🏷️ *Nombre:* ${data.name.toUpperCase()}\n` +
                  `🧬 *Tipos:* ${tipos}\n` +
                  `✨ *Habilidades:* ${habilidades}\n` +
                  `📏 *Altura:* ${data.height / 10}m | ⚖️ *Peso:* ${data.weight / 10}kg\n\n` +
                  `${stats}\n\n` +
                  `Powered by PokeAPI & TheYui-MD`

    const imagen = data.sprites.other['official-artwork'].front_default || data.sprites.front_default

    const buttons = [
      { buttonId: `${config.prefijo}pokedex ${data.id - 1}`, buttonText: { displayText: '⬅️ Anterior' }, type: 1 },
      { buttonId: `${config.prefijo}pokedex ${data.id + 1}`, buttonText: { displayText: 'Siguiente ➡️' }, type: 1 },
      { buttonId: `${config.prefijo}menu`, buttonText: { displayText: '🏠 Menú Principal' }, type: 1 }
    ]

    const buttonMessage = {
      image: { url: imagen },
      caption: texto,
      footer: config.nombreBot,
      buttons: buttons,
      headerType: 4
    }

    await sock.sendMessage(chatId, buttonMessage)

  } catch (err) {
    await sock.sendMessage(chatId, { text: `❌ No se encontró al Pokémon *${pokemon}*. Verifica el nombre e intenta de nuevo.` })
  }
}
