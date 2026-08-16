export const alias = ['pokemon', 'poke']
export const cooldown = 5

export default async function pokedex({ sock, chatId, args, m, config }) {
  const query = args.join(' ').toLowerCase().trim()
  
  if (!query) {
    return sock.sendMessage(chatId, {
      text: `❌ Por favor, ingresa el nombre o número de un Pokémon.\nEjemplo: *${config.prefijo}pokedex charizard*`
    })
  }

  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${query}`)
    if (!res.ok) {
      return sock.sendMessage(chatId, { text: `❌ No se encontró ningún Pokémon llamado *"${query}"*.` })
    }

    const data = await res.json()
    
    const nombre = data.name.toUpperCase()
    const id = data.id
    const tipos = data.types.map(t => t.type.name).join(', ')
    const altura = data.height / 10
    const peso = data.weight / 10
    
    const stats = {}
    data.stats.forEach(s => {
      stats[s.stat.name] = s.base_stat
    })

    const imagen = data.sprites.other['official-artwork'].front_default || data.sprites.front_default

    const caption = `
┏━━━━━━━━━━━━━━━━━━━━━━━━┓
┃   💠  *POKEDEX NEURAL*  💠   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━┛

🧬 *DATOS BÁSICOS:*
» *Nombre:* ${nombre}
» *ID:* #${id}
» *Tipo(s):* ${tipos}
» *Altura:* ${altura}m
» *Peso:* ${peso}kg

📊 *ESTADÍSTICAS BASE:*
» ❤️ *Vida:* ${stats.hp}
» ⚔️ *Ataque:* ${stats.attack}
» 🛡️ *Defensa:* ${stats.defense}
» ⚡ *Velocidad:* ${stats.speed}

━━━━━━━━━━━━━━━━━━━━━━━━
✨ *Powered by TheYui Gacha System*
━━━━━━━━━━━━━━━━━━━━━━━━`.trim()

    await sock.sendMessage(chatId, {
      image: { url: imagen },
      caption: caption
    }, { quoted: m })

  } catch (error) {
    console.error('Error en comando pokedex:', error)
    await sock.sendMessage(chatId, { text: `❌ Ocurrió un error al consultar la Pokedex.` })
  }
}
