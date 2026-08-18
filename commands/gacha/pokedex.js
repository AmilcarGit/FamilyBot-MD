import axios from 'axios'

export const desc = 'Busca información de un Pokémon con diseño de letras especiales'
export const alias = ['poke', 'pokemon']

export default async function pokedex({ sock, chatId, args, config }) {
  if (!args[0]) return sock.sendMessage(chatId, { text: `❌ 𝕻𝖔𝖗 𝖋𝖆𝖛𝖔𝖗, 𝖎𝖓𝖌𝖗𝖊𝖘𝖆 𝖊𝖑 𝖓𝖔𝖒𝖇𝖗𝖊 𝖉𝖊 𝖚𝖓 𝕻𝖔𝖐𝖊𝖒𝖔𝖓.` })

  const pokemon = args[0].toLowerCase()
  
  try {
    const { data } = await axios.get(`https://pokeapi.co/api/v2/pokemon/${pokemon}`)
    
    const stats = data.stats.map(s => `  ┣ 📊 *${s.stat.name.toUpperCase()}:* ${s.base_stat}`).join('\n')
    const tipos = data.types.map(t => t.type.name.toUpperCase()).join(', ')
    const habilidades = data.abilities.map(a => a.ability.name).join(', ')
    
    const texto = `┏━━━━━━━━━━━━━━━━━━━━━━━━┓\n` +
                  `┃  🌌 *𝕿𝕳𝕰 𝖄𝖀𝕴-𝕸𝕯: 𝕻𝕺𝕶𝕰𝕯𝕰𝖃* 🌌  ┃\n` +
                  `┗━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n` +
                  `🆔 *𝕴𝕯:* ${data.id}\n` +
                  `🏷️ *𝕹𝖔𝖒𝖇𝖗𝖊:* ${data.name.toUpperCase()}\n` +
                  `🧬 *𝕿𝖎𝖕𝖔𝖘:* ${tipos}\n` +
                  `✨ *𝕳𝖆𝖇𝖎𝖑𝖎𝖉𝖆𝖉𝖊𝖘:* ${habilidades}\n` +
                  `📏 *𝕬𝖑𝖙𝖚𝖗𝖆:* ${data.height / 10}m | ⚖️ *𝕻𝖊𝖘𝖔:* ${data.weight / 10}kg\n\n` +
                  `┏━━ *𝕰𝕾𝕿𝕬𝕯𝕴𝕾𝕿𝕴𝕮𝕬𝕾* ━━┓\n` +
                  `${stats}\n` +
                  `┗━━━━━━━━━━━━━━━━━━━━━━┛\n\n` +
                  `_𝕻𝖔𝖜𝖊𝖗𝖊𝖉 𝖇𝖞 𝕬𝖒𝖎𝖑𝖈𝖆𝖗𝕲𝖎𝖙_`

    const imagen = data.sprites.other['official-artwork'].front_default || data.sprites.front_default

    await sock.sendMessage(chatId, {
      image: { url: imagen },
      caption: texto
    })

  } catch (err) {
    await sock.sendMessage(chatId, { text: `❌ 𝕹𝖔 𝖘𝖊 𝖊𝖓𝖈𝖔𝖓𝖙𝖗𝖔 𝖆𝖑 𝕻𝖔𝖐𝖊𝖒𝖔𝖓 *${pokemon}*.` })
  }
}
