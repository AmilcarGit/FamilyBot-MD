export const desc = 'Muestra los comandos de economía disponibles'
export const alias = ['eco']
export const cooldown = 3

export default async function economia({ sock, chatId, config }) {
  const p = config.prefijo

  await sock.sendMessage(chatId, {
    text:
      `💰 *Comandos de economía*\n\n` +
      `▢ ${p}saldo\n▢ ${p}depositar <monto>\n▢ ${p}retirar <monto>\n▢ ${p}minar (cada 30 min)\n▢ ${p}trabajar (cada 1 hora)\n▢ ${p}cosechar (cada 45 min)\n▢ ${p}robar @usuario (cada 20 min)\n▢ ${p}apostar <monto>\n▢ ${p}transferir @usuario <monto>\n▢ ${p}diario (cada 24h, con racha)\n▢ ${p}top\n▢ ${p}tienda\n▢ ${p}comprar <item>\n▢ ${p}inventario\n▢ ${p}ruleta <color> <monto>\n▢ ${p}tragamonedas <monto>`,
  })
}