export const desc = 'Muestra el clima de una ciudad.'
export const alias = ['weather', 'tiempo']
export const cooldown = 5

export default async function clima({ sock, chatId, args, config }) {
  const city = args.join(' ').trim()
  
  if (!city) {
    return sock.sendMessage(chatId, {
      text: `❌ Por favor, ingresa el nombre de una ciudad.\nEjemplo: *${config.prefijo}clima Lima*`
    })
  }

  try {
    const apiKey = 'evogb-jRhjmDSp'
    const url = `https://api.evogb.org/tools/clima?city=${encodeURIComponent(city)}&version=auto&key=${apiKey}`
    
    const response = await fetch(url)
    const data = await response.json()

    if (!data.status || !data.result) {
      return sock.sendMessage(chatId, {
        text: `❌ No se pudo obtener el clima para: *${city}*`
      })
    }

    const { location, summary } = data.result
    let mensaje = `🌍 *Clima en:* ${location}\n\n`
    mensaje += `🌡️ *Temperatura:* ${summary.temperature}\n`
    mensaje += `☁️ *Estado:* ${summary.weather}\n`
    mensaje += `💨 *Viento:* ${summary.wind_speed}\n`
    mensaje += `🔼 *Máxima:* ${summary.max_temp_today}\n`
    mensaje += `🔽 *Mínima:* ${summary.min_temp_today}\n`
    mensaje += `☀️ *Índice UV:* ${summary.uv_index_max}`

    await sock.sendMessage(chatId, { text: mensaje })

  } catch (error) {
    console.error('Error en comando clima:', error)
    await sock.sendMessage(chatId, {
      text: `❌ Ocurrió un error al consultar el clima.`
    })
  }
}
