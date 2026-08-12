import util from 'util'

export const desc = 'Ejecuta código JavaScript (solo owner)'
export const soloOwner = true
export const cooldown = 3

export default async function evalCmd({ sock, msg, args, chatId, db, config }) {
  const codigo = args.join(' ')

  if (!codigo) {
    return sock.sendMessage(chatId, { text: '❀ Escribe el código a ejecutar.' })
  }

  try {
    let resultado = await eval(`(async () => { ${codigo} })()`)
    let texto = typeof resultado === 'string' ? resultado : util.inspect(resultado, { depth: 1 })

    if (texto.length > 3500) texto = texto.slice(0, 3500) + '\n...(cortado)'

    await sock.sendMessage(chatId, { text: `✅ *Resultado:*\n\n\`\`\`${texto}\`\`\`` })
  } catch (err) {
    await sock.sendMessage(chatId, { text: `❌ *Error:*\n\n\`\`\`${err.message}\`\`\`` })
  }
}