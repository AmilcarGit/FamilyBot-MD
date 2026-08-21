import * as Baileys from '@whiskeysockets/baileys'

const generateWAMessageFromContent =
  Baileys.generateWAMessageFromContent ||
  Baileys.default?.generateWAMessageFromContent

export const desc = 'Menú principal de FamilyBot-MD'

export const alias = [
  'menu',
  'help',
  'ayuda'
]

export const cooldown = 3

export default async function menu({
  sock,
  chatId,
  msg,
  config,
  db
}) {
  const jid =
    msg?.key?.participant ||
    msg?.key?.remoteJid

  const numero =
    jid?.split('@')[0] ||
    'Usuario'

  const users =
    db?.data?.users || {}

  const user =
    users[jid] || {}

  const nivel =
    user.level ??
    user.nivel ??
    1

  const xp =
    user.exp ??
    user.xp ??
    0

  const rango =
    user.rank ??
    user.rango ??
    'Miembro'

  const nombreBot =
    config?.nombreBot ||
    'FamilyBot-MD'

  const version =
    config?.version ||
    '2.0'

  const prefijo =
    config?.prefijo ||
    '.'

  const texto = `
╭─────── 🌿 ───────╮
   𝐅𝐀𝐌𝐈𝐋𝐘𝐁𝐎𝐓-𝐌𝐃
      𝐌𝐄𝐍𝐔
╰─────── 🌿 ───────╯

👋 𝐇𝐨𝐥𝐚, @${numero}

╭─❖ 𝐁𝐎𝐓 𝐈𝐍𝐅𝐎
│ 🤖 ${nombreBot}
│ 🟢 Online
│ ⚡ v${version}
│ 👑 AmilcarGit
╰────────────

╭─❖ 𝐓𝐔 𝐏𝐄𝐑𝐅𝐈𝐋
│ ⭐ Nivel: ${nivel}
│ ✨ XP: ${Number(xp).toLocaleString()}
│ 🎖️ Rango: ${rango}
╰────────────

╭─❖ 𝐂𝐀𝐓𝐄𝐆𝐎𝐑𝐈𝐄𝐒
│ 🎴 Gacha
│ 🎮 Juegos
│ 🤖 IA
│ 🎵 Música
│ 🎬 Multimedia
│ 🖼️ Imágenes
│ 🛠️ Tools
│ 👥 Grupo
│ 👑 Owner
╰────────────

🌿 *𝐌𝐨𝐫𝐞 𝐭𝐡𝐚𝐧 𝐚 𝐛𝐨𝐭...*
   *𝐖𝐞'𝐫𝐞 𝐟𝐚𝐦𝐢𝐥𝐲.*

╭───────────────╮
│   ⚡ 𝐏𝐈𝐍𝐆   │
╰───────────────╯

        🍃 𝐀𝐦𝐢𝐥𝐜𝐚𝐫𝐆𝐢𝐭
`.trim()

  const message =
    generateWAMessageFromContent(
      chatId,
      {
        interactiveMessage: {
          body: {
            text: texto
          },
          footer: {
            text:
              `${nombreBot} • ${prefijo}help`
          },
          header: {
            title:
              '🌿 FAMILYBOT-MD',
            hasMediaAttachment:
              false
          },
          nativeFlowMessage: {
            buttons: [
              {
                name:
                  'quick_reply',
                buttonParamsJson:
                  JSON.stringify({
                    display_text:
                      '⚡ 𝐏𝐈𝐍𝐆',
                    id:
                      `${prefijo}ping`
                  })
              }
            ]
          }
        }
      },
      {
        quoted: msg
      }
    )

  await sock.relayMessage(
    chatId,
    message.message,
    {
      messageId:
        message.key.id
    }
  )
}