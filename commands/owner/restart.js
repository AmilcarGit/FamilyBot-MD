import { exec } from 'child_process'

export const desc = 'Reinicia el bot de forma segura y limpia'
export const alias = ['reboot']
export const soloOwner = true

export default async function restart({ sock, chatId, config }) {
  await sock.sendMessage(chatId, { text: '🔄 *REINICIO NEURAL EN CURSO*\n\nLimpiando procesos y liberando memoria, espera 5 segundos...' })
  
  setTimeout(() => {
    if (process.env.PM2_HOME) {
      exec('pm2 restart yui-bot', (err) => {
        if (err) process.exit(0)
      })
    } else {
      process.exit(0)
    }
  }, 2000)
}
