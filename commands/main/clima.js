export const desc = 'Consulta el clima de una ciudad.'
export const alias = ['weather', 'temp']
export const cooldown = 5

export default async function clima({ sock, chatId, args, m, config }) {
  const city = args.join(' ').trim()
  
  if (!city) {
    return sock.sendMessage(chatId, {
      text: `❌ Por favor, ingresa el nombre de una ciudad.\nEjemplo: *${config.prefijo}clima Lima*`
    })
  }

  try {
    const apiKey = 'evogb-jRhjmDSp'
    const apiUrl = `https://api.evogb.org/tools/clima?city=${encodeURIComponent(city)}&version=auto&key=${apiKey}`
    
    const res = await fetch(apiUrl)
    const data = await res.json()

    if (!data.status || !data.result) {
      return sock.sendMessage(chatId, { text: `❌ No se pudo encontrar información del clima para *"${city}"*.` })
    }

    const { location, summary } = data.result
    const { weather, temperature, wind_speed, min_temp_today, max_temp_today, uv_index_max } = summary

    const textoClima = `🌍 *CLIMA EN:* ${location}\n\n` +
      `🌡️ *Estado:* ${weather}\n` +
      `🌡️ *Temperatura:* ${temperature}\n` +
      `📉 *Mínima:* ${min_temp_today}\n` +
      `📈 *Máxima:* ${max_temp_today}\n` +
      `💨 *Viento:* ${wind_speed}\n` +
      `☀️ *Índice UV:* ${uv_index_max}`

    await sock.sendMessage(chatId, { text: textoClima }, { quoted: m })

  } catch (error) {
    console.error('Error en comando clima:', error)
    await sock.sendMessage(chatId, { text: `❌ Ocurrió un error al consultar el clima.` })
  }
}
