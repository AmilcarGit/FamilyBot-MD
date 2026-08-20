import { obtenerImagenMenuAleatoria } from '../../lib/randomImage.js'
import { normalizarJid } from '../../lib/utils.js'
import * as Baileys from '@whiskeysockets/baileys'

const generateWAMessageFromContent = Baileys.generateWAMessageFromContent || Baileys.default?.generateWAMessageFromContent
const prepareWAMessageMedia = Baileys.prepareWAMessageMedia || Baileys.default?.prepareWAMessageMedia

export const desc = 'Muestra el menú neural de comandos'
export const alias = ['help', 'ayuda', 'menu']
export const cooldown = 5

const ICONOS = {
  main: '💠',
  descargas: '📥',
  economia: '💰',
  gacha: '🧧',
  grupo: '🛡️',
  media: '🎬',
  owner: '👑',
  social: '🎭',
  juegos: '🎮',
  perfil: '👤',
  subbot: '🤖',
  herramientas: '🛠️',
  ia: '🧠',
  premium: '💎'
}

function formatRuntime(seconds) {
  const d = Math.floor(seconds / (3600 * 24))
  const h = Math.floor((seconds % (3600 * 24)) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${d}ᴅ ${h}ʜ ${m}ᴍ`
}

export default async function menu({ sock, chatId, comandos, config, db, msg }) {
  try {
    const jidRemitente = msg.key.participant || msg.key.remoteJid
    const isRegistered = db.data.users[normalizarJid(jidRemitente)]?.registrado

    const uptime = formatRuntime(process.uptime())
    const ram = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)
    const totalUsers = Object.keys(db.data.users || {}).length
    const fecha = new Date().toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })

    const porCategoria = {}
    comandos.forEach(c => {
      if (c.oculto || (config.comandosDesactivados || []).includes(c.nombre)) return
      const cat = c.categoria || 'main'
      if (!porCategoria[cat]) porCategoria[cat] = []
      porCategoria[cat].push(c)
    })

    let menuText = `┏━━━━━━━━━━━━━━━━━━━━━━━━┓
┃   🌌  *ᴛʜᴇ ʏᴜɪ-ᴍᴅ ᴠ1*  🌌   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━┛

🛰️ *sᴛᴀᴛᴜs ɴᴇᴜʀᴀʟ:*
» *ᴜᴘᴛɪᴍᴇ:* ${uptime}
» *ʀᴀᴍ:* ${ram} ᴍʙ / 1024 ᴍʙ
» *ᴜsᴜᴀʀɪᴏs:* ${totalUsers}
» *ᴘʀᴇғɪᴊᴏ:* [ ${config.prefijo} ]

📅 *ғᴇᴄʜᴀ:* ${fecha}
━━━━━━━━━━━━━━━━━━━━━━━━
`

    const categorias = Object.keys(porCategoria).sort()
    categorias.forEach(cat => {
      const icon = ICONOS[cat.toLowerCase()] || '📂'
      menuText += `\n┏━━〔 ${icon} *${cat.toUpperCase()}* 〕━━┓\n`

      porCategoria[cat].forEach(c => {
        const requiereReg = !['main', 'owner'].includes(cat.toLowerCase())
        const lock = (requiereReg && !isRegistered) ? ' 🔐' : ''

        menuText += `┃ ✧ *${config.prefijo}${c.nombre}*${lock}\n`
        menuText += `┃   🌾 _${c.desc || 'sɪɴ ᴅᴇsᴄʀɪᴘᴄɪᴏ́ɴ'}_\n`
      })

      menuText += `┗━━━━━━━━━━━━━━━━━━━━┛\n`
    })

    menuText += `\n✨ *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀᴍɪʟᴄᴀɢɪᴛ*
${isRegistered ? '✅ _¡ᴇsᴛᴀs ʀᴇɢɪsᴛʀᴀᴅᴏ!_' : '💡 _ᴜsᴀ ' + config.prefijo + 'reg ᴘᴀʀᴀ ʀᴇɢɪsᴛʀᴀʀᴛᴇ_'}`

    menuText = menuText.trim()

    let imagen = null
    try {
      imagen = obtenerImagenMenuAleatoria()
    } catch (e) {}

    const buttons = [
      {
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: '🏓 ᴘɪɴɢ',
          id: `${config.prefijo}ping`
        })
      }
    ]

    if (generateWAMessageFromContent) {
      try {
        let media = null
        if (imagen) {
          try {
            media = await prepareWAMessageMedia({ image: imagen }, { upload: sock.waUploadToServer })
          } catch (e) {
            console.error('❌ Error preparando imagen del menú:', e)
          }
        }

        const interactiveMessage = {
          body: { text: menuText },
          footer: { text: config.nombreBot },
          header: {
            title: media ? undefined : `🌌 ${config.nombreBot}`,
            hasMediaAttachment: !!media,
            imageMessage: media ? media.imageMessage : null
          },
          nativeFlowMessage: {
            buttons: buttons
          }
        }

        const message = generateWAMessageFromContent(chatId, {
          viewOnceMessage: {
            message: {
              interactiveMessage: interactiveMessage
            }
          }
        }, { quoted: msg })

        await sock.relayMessage(chatId, message.message, { messageId: message.key.id })
        return
      } catch (e) {
        console.error('❌ Error enviando menú con botón:', e)
      }
    }

    if (imagen) {
      try {
        await sock.sendMessage(chatId, {
          image: imagen,
          caption: menuText
        }, { quoted: msg })
        return
      } catch (e) {
        console.error('❌ Error enviando imagen del menú:', e)
      }
    }

    await sock.sendMessage(chatId, {
      text: menuText
    }, { quoted: msg })

  } catch (error) {
    console.error('❌ Error en menu:', error)
  }
}