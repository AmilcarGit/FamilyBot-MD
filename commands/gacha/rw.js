import fetch from 'node-fetch'
import * as Baileys from '@whiskeysockets/baileys'

const generateWAMessageFromContent = Baileys.generateWAMessageFromContent || Baileys.default?.generateWAMessageFromContent
const prepareWAMessageMedia = Baileys.prepareWAMessageMedia || Baileys.default?.prepareWAMessageMedia

export const desc = 'Sistema Gacha interactivo con personajes e imágenes'
export const alias = ['gacha', 'rw', 'roll']
export const cooldown = 5

const personajes = [
  {
    id: '001',
    nombre: 'Yui',
    rareza: 'COMMON',
    emoji: '⚪',
    poder: [100, 500]
  },
  {
    id: '002',
    nombre: 'Elyssia',
    rareza: 'UNCOMMON',
    emoji: '🟢',
    poder: [400, 900]
  },
  {
    id: '003',
    nombre: 'Kael',
    rareza: 'RARE',
    emoji: '🔵',
    poder: [800, 1500]
  },
  {
    id: '004',
    nombre: 'TheEly',
    rareza: 'EPIC',
    emoji: '🟣',
    poder: [1400, 2500]
  },
  {
    id: '005',
    nombre: 'Amilcar',
    rareza: 'LEGENDARY',
    emoji: '🟡',
    poder: [2500, 5000]
  },
  {
    id: '006',
    nombre: 'Family Guardian',
    rareza: 'MYTHIC',
    emoji: '🔴',
    poder: [5000, 9000]
  },
  {
    id: '007',
    nombre: 'Secret Yui',
    rareza: 'SECRET',
    emoji: '🌈',
    poder: [9000, 15000]
  }
]

const rarezas = [
  { nombre: 'COMMON', peso: 55 },
  { nombre: 'UNCOMMON', peso: 25 },
  { nombre: 'RARE', peso: 12 },
  { nombre: 'EPIC', peso: 5 },
  { nombre: 'LEGENDARY', peso: 2 },
  { nombre: 'MYTHIC', peso: 0.8 },
  { nombre: 'SECRET', peso: 0.2 }
]

const imagenes = [
  'https://i.postimg.cc/8kYV5XxY/yui.jpg',
  'https://i.postimg.cc/9Q8xWkYk/elyssia.jpg',
  'https://i.postimg.cc/3J7h8V6M/kael.jpg'
]

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function elegirRareza() {
  const total = rarezas.reduce((a, b) => a + b.peso, 0)
  let valor = Math.random() * total

  for (const rareza of rarezas) {
    valor -= rareza.peso

    if (valor <= 0) {
      return rareza.nombre
    }
  }

  return 'COMMON'
}

function obtenerPersonaje() {
  const rareza = elegirRareza()

  const disponibles = personajes.filter(
    p => p.rareza === rareza
  )

  const lista = disponibles.length
    ? disponibles
    : personajes

  const personaje = lista[random(0, lista.length - 1)]

  return {
    ...personaje,
    poder: random(
      personaje.poder[0],
      personaje.poder[1]
    )
  }
}

async function obtenerImagen() {
  try {
    const url = imagenes[
      random(0, imagenes.length - 1)
    ]

    const res = await fetch(url)

    if (!res.ok) {
      return null
    }

    return url
  } catch (e) {
    console.error('❌ Error obteniendo imagen:', e)
    return null
  }
}

function obtenerUsuario(db, jid) {
  if (!db.data.users) {
    db.data.users = {}
  }

  if (!db.data.users[jid]) {
    db.data.users[jid] = {}
  }

  const user = db.data.users[jid]

  if (!Array.isArray(user.gacha)) {
    user.gacha = []
  }

  if (typeof user.gachaTickets !== 'number') {
    user.gachaTickets = 10
  }

  return user
}

async function enviarMensaje({
  sock,
  chatId,
  msg,
  config,
  titulo,
  texto,
  imagen,
  botones
}) {
  try {
    let media = null

    if (imagen) {
      try {
        media = await prepareWAMessageMedia(
          {
            image: {
              url: imagen
            }
          },
          {
            upload: sock.waUploadToServer
          }
        )
      } catch (e) {
        console.error(
          '❌ Error preparando imagen del Gacha:',
          e
        )
      }
    }

    const buttons = botones.map(boton => ({
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: boton.text,
        id: `${config.prefijo}${boton.id}`
      })
    }))

    const interactiveMessage = {
      body: {
        text: texto
      },
      footer: {
        text: config.nombreBot
      },
      header: {
        title: titulo,
        hasMediaAttachment: !!media,
        imageMessage: media
          ? media.imageMessage
          : null
      },
      nativeFlowMessage: {
        buttons
      }
    }

    const message =
      generateWAMessageFromContent(
        chatId,
        {
          viewOnceMessage: {
            message: {
              interactiveMessage
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
        messageId: message.key.id
      }
    )
  } catch (error) {
    console.error(
      '❌ Error enviando Gacha:',
      error
    )

    await sock.sendMessage(
      chatId,
      {
        text: texto
      },
      {
        quoted: msg
      }
    )
  }
}

export default async function gacha({
  sock,
  chatId,
  args,
  msg,
  config,
  db
}) {
  const accion =
    args.join(' ').toLowerCase().trim() ||
    'menu'

  const jid =
    msg.key.participant ||
    msg.key.remoteJid

  const user =
    obtenerUsuario(db, jid)

  if (
    accion === 'menu' ||
    accion === 'help' ||
    accion === 'ayuda'
  ) {
    const texto = `
╭━━〔 🎴 *FAMILY GACHA* 〕━━╮

👤 Jugador:
@${jid.split('@')[0]}

🎟️ Tickets:
*${user.gachaTickets}*

🎒 Colección:
*${user.gacha.length}*

✨ ¡Pon a prueba tu suerte!

💎 *RAREZAS*

⚪ COMMON
🟢 UNCOMMON
🔵 RARE
🟣 EPIC
🟡 LEGENDARY
🔴 MYTHIC
🌈 SECRET

╰━━━━━━━━━━━━━━━━━━━━━━╯
`.trim()

    return enviarMensaje({
      sock,
      chatId,
      msg,
      config,
      titulo: '🎴 FAMILY GACHA',
      texto,
      imagen: await obtenerImagen(),
      botones: [
        {
          text: '🎴 GACHA ×1',
          id: 'gacha 1'
        },
        {
          text: '🌟 GACHA ×10',
          id: 'gacha 10'
        },
        {
          text: '🎒 COLECCIÓN',
          id: 'gacha coleccion'
        },
        {
          text: '🏆 RANKING',
          id: 'gacha ranking'
        }
      ]
    })
  }

  if (
    accion === '1' ||
    accion === 'x1'
  ) {
    if (user.gachaTickets < 1) {
      return enviarMensaje({
        sock,
        chatId,
        msg,
        config,
        titulo: '🎟️ SIN TICKETS',
        texto: `
╭━━〔 🎟️ *SIN TICKETS* 〕━━╮

❌ No tienes tickets suficientes.

🎟️ Disponibles:
*${user.gachaTickets}*

╰━━━━━━━━━━━━━━━━━━━━━━╯
`.trim(),
        imagen: await obtenerImagen(),
        botones: [
          {
            text: '🎒 COLECCIÓN',
            id: 'gacha coleccion'
          },
          {
            text: '🏠 MENÚ',
            id: 'gacha'
          }
        ]
      })
    }

    user.gachaTickets--

    const personaje =
      obtenerPersonaje()

    const imagen =
      await obtenerImagen()

    personaje.imagen = imagen
    personaje.fecha = Date.now()

    user.gacha.push(personaje)

    const texto = `
╭━━〔 ✨ *NUEVA OBTENCIÓN* 〕━━╮

${personaje.emoji} *${personaje.nombre}*

💎 Rareza:
*${personaje.rareza}*

⭐ Poder:
*${personaje.poder.toLocaleString()}*

🆔 ID:
*#${personaje.id}*

🎟️ Tickets:
*${user.gachaTickets}*

╰━━━━━━━━━━━━━━━━━━━━━━╯
`.trim()

    return enviarMensaje({
      sock,
      chatId,
      msg,
      config,
      titulo:
        `🎴 ${personaje.nombre} #${personaje.id}`,
      texto,
      imagen,
      botones: [
        {
          text: '🔄 OTRA VEZ',
          id: 'gacha 1'
        },
        {
          text: '🌟 GACHA ×10',
          id: 'gacha 10'
        },
        {
          text: '🎒 COLECCIÓN',
          id: 'gacha coleccion'
        }
      ]
    })
  }

  if (
    accion === '10' ||
    accion === 'x10'
  ) {
    if (user.gachaTickets < 10) {
      return enviarMensaje({
        sock,
        chatId,
        msg,
        config,
        titulo: '🎟️ TICKETS',
        texto: `
╭━━〔 ❌ *INSUFICIENTES* 〕━━╮

Necesitas:
🎟️ *10 tickets*

Tienes:
🎟️ *${user.gachaTickets}*

╰━━━━━━━━━━━━━━━━━━━━━━╯
`.trim(),
        imagen: await obtenerImagen(),
        botones: [
          {
            text: '🎴 GACHA ×1',
            id: 'gacha 1'
          },
          {
            text: '🏠 MENÚ',
            id: 'gacha'
          }
        ]
      })
    }

    user.gachaTickets -= 10

    const resultados = []

    for (let i = 0; i < 10; i++) {
      const personaje =
        obtenerPersonaje()

      const imagen =
        await obtenerImagen()

      personaje.imagen = imagen
      personaje.fecha = Date.now()

      user.gacha.push(personaje)
      resultados.push(personaje)
    }

    const lista =
      resultados.map(
        (p, i) =>
          `${i + 1}. ${p.emoji} *${p.nombre}*\n` +
          `   💎 ${p.rareza}\n` +
          `   ⭐ ${p.poder.toLocaleString()}`
      ).join('\n\n')

    const imagenPrincipal =
      resultados.find(
        p => p.imagen
      )?.imagen || null

    const texto = `
╭━━〔 🌟 *GACHA ×10* 〕━━╮

🎉 *¡DIEZ OBTENCIONES!*

${lista}

━━━━━━━━━━━━━━━━━━━━

🎟️ Tickets restantes:
*${user.gachaTickets}*

╰━━━━━━━━━━━━━━━━━━━━━━╯
`.trim()

    return enviarMensaje({
      sock,
      chatId,
      msg,
      config,
      titulo: '🌟 FAMILY GACHA ×10',
      texto,
      imagen: imagenPrincipal,
      botones: [
        {
          text: '🔄 ×10',
          id: 'gacha 10'
        },
        {
          text: '🎴 ×1',
          id: 'gacha 1'
        },
        {
          text: '🎒 COLECCIÓN',
          id: 'gacha coleccion'
        }
      ]
    })
  }

  if (
    accion === 'coleccion' ||
    accion === 'collection'
  ) {
    const lista =
      user.gacha
        .slice(-10)
        .reverse()

    if (!lista.length) {
      return enviarMensaje({
        sock,
        chatId,
        msg,
        config,
        titulo: '🎒 COLECCIÓN',
        texto: `
╭━━〔 🎒 *MI COLECCIÓN* 〕━━╮

📭 Todavía no tienes personajes.

🎴 ¡Haz tu primera tirada!

╰━━━━━━━━━━━━━━━━━━━━━━╯
`.trim(),
        imagen: await obtenerImagen(),
        botones: [
          {
            text: '🎴 GACHA ×1',
            id: 'gacha 1'
          },
          {
            text: '🌟 GACHA ×10',
            id: 'gacha 10'
          }
        ]
      })
    }

    const texto = `
╭━━〔 🎒 *MI COLECCIÓN* 〕━━╮

👤 @${jid.split('@')[0]}

🎴 Total:
*${user.gacha.length}*

🎟️ Tickets:
*${user.gachaTickets}*

${lista.map(
  (p, i) =>
    `${i + 1}. ${p.emoji} *${p.nombre}*\n` +
    `   💎 ${p.rareza} | ⭐ ${p.poder.toLocaleString()}`
).join('\n\n')}

╰━━━━━━━━━━━━━━━━━━━━━━╯
`.trim()

    const imagen =
      lista.find(
        p => p.imagen
      )?.imagen ||
      await obtenerImagen()

    return enviarMensaje({
      sock,
      chatId,
      msg,
      config,
      titulo: '🎒 MI COLECCIÓN',
      texto,
      imagen,
      botones: [
        {
          text: '🎴 GACHA ×1',
          id: 'gacha 1'
        },
        {
          text: '🌟 GACHA ×10',
          id: 'gacha 10'
        },
        {
          text: '🏆 RANKING',
          id: 'gacha ranking'
        }
      ]
    })
  }

  return enviarMensaje({
    sock,
    chatId,
    msg,
    config,
    titulo: '🎴 FAMILY GACHA',
    texto: `
❌ *COMANDO NO ENCONTRADO*

Usa:
*${config.prefijo}gacha*
`.trim(),
    imagen: await obtenerImagen(),
    botones: [
      {
        text: '🎴 ABRIR GACHA',
        id: 'gacha'
      }
    ]
  })
}