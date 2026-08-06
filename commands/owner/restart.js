import { spawn } from 'child_process'

export const desc = 'Reinicia el bot'
export const cooldown = 0
export const soloOwner = true

export default async function restart({ sock, chatId }) {
  await sock.sendMessage(chatId, { text: '🔄 Reiniciando el bot...' })

  const hijo = spawn(process.argv[0], process.argv.slice(1), {
    cwd: process.cwd(),
    detached: true,
    stdio: 'ignore',
  })

  hijo.unref()

  setTimeout(() => process.exit(0), 500)
}
