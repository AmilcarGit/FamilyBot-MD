import fetch from 'node-fetch'
import * as Baileys from '@whiskeysockets/baileys'

const generateWAMessageFromContent =
  Baileys.generateWAMessageFromContent ||
  Baileys.default?.generateWAMessageFromContent

const prepareWAMessageMedia =
  Baileys.prepareWAMessageMedia ||
  Baileys.default?.prepareWAMessageMedia

export const desc = 'Sistema Gacha interactivo de FamilyBot-MD'
export const alias = ['gacha', 'rw', 'roll']
export const cooldown = 5

const PERSONAJES = [
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

const RAREZAS = [
  { nombre: 'COMMON', peso: 55 },
  { nombre: 'UNCOMMON', peso: 25 },
  { nombre: 'RARE', peso: 12 },
  { nombre: 'EPIC', peso: 5 },
  { nombre: 'LEGENDARY', peso: 2 },
  { nombre: 'MYTHIC', peso: 0.8 },
  { nombre: 'SECRET', peso: 0.2 }
]

function random(min, max) {
  return Math.floor(
    Math.random() * (max - min + 1)
  ) + min
}

function elegirRareza() {
  const total = RAREZAS.reduce(
    (a, b) => a + b.peso,
    0
  )

  let valor = Math.random() * total

  for (const rareza of RAREZAS) {
    valor -= rareza.peso

    if (valor <= 0) {
      return rareza.nombre
    }
  }

  return 'COMMON'
}

function obtenerPersonaje() {
  const rareza = elegirRareza()

  const disponibles =
    PERSONAJES.filter(
      p => p.rareza === rareza
    )

  const lista = disponibles.length
    ? disponibles
    : PERSONAJES.filter(
        p => p.rareza === 'COMMON'
      )

  const personaje =
    lista[random(0, lista.length - 1)]

  return {
    ...personaje,
    poder: random(
      personaje.poder[0],
      personaje.poder[1]
    ),
    obtenido: Date.now()
  }
}

async function obtenerImagen() {
  try {
    const respuesta = await fetch(
      'https://api.waifu.im/search?included_tags=waifu'
    )

    if (!respuesta.ok) {
      return null
    }

    const data =
      await respuesta.json()

    if (
      !data.images ||
      !data.images.length
    ) {
      return null
    }

    return data.images[0].url || null
  } catch (error) {
    console.error(
      'Error obteniendo imagen:',
      error
    )

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

  const user =
    db.data.users[jid]

  if (!Array.isArray(user.gacha)) {
    user.gacha = []
  }

  if (
    typeof user.gachaTickets !==
    'number'
  ) {
    user.gachaTickets = 10
  }

  return user
}

function crearBotones(
  config,
  botones
) {
  return botones.map(boton => ({
    name: 'quick_reply',
    buttonParamsJson:
      JSON.stringify({
        display_text:
          boton.text,
        id:
          `${config.prefijo}${boton.id}`
      })
  }))
}

async function enviarGacha({
  sock,
  chatId,
  msg,
  config,
  texto,
  titulo,
  imagen,
  botones
}) {
  try {
    let media = null

    if (imagen) {
      try {
        media =
          await prepareWAMessageMedia(
            {
              image: {
                url: imagen
              }
            },
            {
              upload:
                sock.waUploadToServer
            }
          )
      } catch (error) {
        console.error(
          '❌ Error preparando imagen del Gacha:',
          error
        )
      }
    }

    const buttons =
      crearBotones(
        config,
        botones
      )

    const interactiveMessage = {
      body: {
        text: texto
      },
      footer: {
        text:
          config.nombreBot
      },
      header: {
        title: titulo,
        hasMediaAttachment:
          !!media,
        imageMessage:
          media
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
        messageId:
          message.key.id
      }
    )
  } catch (error) {
    console.error(
      'Error enviando Gacha:',
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

function textoPersonaje(
  personaje
) {
  return `
${personaje.emoji} *${personaje.nombre}*

💎 Rareza:
*${personaje.rareza}*

⭐ Poder:
*${personaje.poder.toLocaleString()}*

🆔 ID:
*#${personaje.id}*
`.trim()
}

function textoDiez(
  personajes
) {
  return personajes
    .map(
      (p, i) =>
        `${i + 1}. ${p.emoji} *${p.nombre}*\n` +
        `   💎 ${p.rareza}\n` +
        `   ⭐ ${p.poder.toLocaleString()}\n` +
        `   🆔 #${p.id}`
    )
    .join('\n\n')
}

function obtenerRanking(db) {
  return Object.entries(
    db.data.users || {}
  )
    .map(([jid, user]) => ({
      jid,
      cantidad:
        Array.isArray(
          user.gacha
        )
          ? user.gacha.length
          : 0
    }))
    .filter(
      x => x.cantidad > 0
    )
    .sort(
      (a, b) =>
        b.cantidad -
        a.cantidad
    )
    .slice(0, 10)
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
    args?.[0]
      ?.toLowerCase() ||
    'menu'

  const jid =
    msg.key.participant ||
    msg.key.remoteJid

  const user =
    obtenerUsuario(
      db,
      jid
    )

  if (
    accion === 'menu' ||
    accion === 'help' ||
    accion === 'ayuda'
  ) {
    const texto = `
╭━━━〔 🎴 *FAMILY GACHA* 〕━━━╮
┃
┃ 👤 Jugador:
┃ @${jid.split('@')[0]}
┃
┃ 🎟️ Tickets:
┃ *${user.gachaTickets}*
┃
┃ 🎴 Colección:
┃ *${user.gacha.length}*
┃
┃ ✨ Consigue personajes
┃ y completa tu colección.
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯

💎 *RAREZAS*

⚪ COMMON
🟢 UNCOMMON
🔵 RARE
🟣 EPIC
🟡 LEGENDARY
🔴 MYTHIC
🌈 SECRET
`.trim()

    return enviarGacha({
      sock,
      chatId,
      msg,
      config,
      texto,
      titulo:
        '🎴 FAMILY GACHA',
      botones: [
        {
          text:
            '🎴 ɢᴀᴄʜᴀ ×1',
          id:
            'gacha 1'
        },
        {
          text:
            '🌟 ɢᴀᴄʜᴀ ×10',
          id:
            'gacha 10'
        },
        {
          text:
            '🎒 ᴄᴏʟᴇᴄᴄɪóɴ',
          id:
            'gacha coleccion'
        },
        {
          text:
            '🏆 ʀᴀɴᴋɪɴɢ',
          id:
            'gacha ranking'
        }
      ]
    })
  }

  if (
    accion === '1' ||
    accion === 'x1'
  ) {
    if (
      user.gachaTickets < 1
    ) {
      return enviarGacha({
        sock,
        chatId,
        msg,
        config,
        texto: `
╭━━〔 🎟️ *TICKETS* 〕━━╮

❌ No tienes tickets.

🎟️ Disponibles:
*${user.gachaTickets}*

╰━━━━━━━━━━━━━━━━━━━━━━╯
`.trim(),
        titulo:
          '🎟️ SIN TICKETS',
        botones: [
          {
            text:
              '🎒 ᴄᴏʟᴇᴄᴄɪóɴ',
            id:
              'gacha coleccion'
          },
          {
            text:
              '🏠 ᴍᴇɴú',
            id:
              'gacha'
          }
        ]
      })
    }

    user.gachaTickets--

    const personaje =
      obtenerPersonaje()

    const imagen =
      await obtenerImagen()

    personaje.imagen =
      imagen

    user.gacha.push(
      personaje
    )

    const texto = `
╭━━〔 ✨ *NUEVA OBTENCIÓN* 〕━━╮

${textoPersonaje(
  personaje
)}

━━━━━━━━━━━━━━━━━━━━

🎟️ Tickets restantes:
*${user.gachaTickets}*

╰━━━━━━━━━━━━━━━━━━━━━━╯
`.trim()

    return enviarGacha({
      sock,
      chatId,
      msg,
      config,
      texto,
      titulo:
        `🎴 ${personaje.nombre} #${personaje.id}`,
      imagen,
      botones: [
        {
          text:
            '🔄 ᴏᴛʀᴀ ᴠᴇᴢ',
          id:
            'gacha 1'
        },
        {
          text:
            '🌟 ×10',
          id:
            'gacha 10'
        },
        {
          text:
            '🎒 ᴄᴏʟᴇᴄᴄɪóɴ',
          id:
            'gacha coleccion'
        }
      ]
    })
  }

  if (
    accion === '10' ||
    accion === 'x10'
  ) {
    if (
      user.gachaTickets < 10
    ) {
      return enviarGacha({
        sock,
        chatId,
        msg,
        config,
        texto: `
╭━━〔 ❌ *TICKETS INSUFICIENTES* 〕━━╮

Necesitas:
🎟️ *10 tickets*

Tienes:
🎟️ *${user.gachaTickets}*

╰━━━━━━━━━━━━━━━━━━━━━━╯
`.trim(),
        titulo:
          '🎟️ TICKETS',
        botones: [
          {
            text:
              '🎴 ×1',
            id:
              'gacha 1'
          },
          {
            text:
              '🎒 ᴄᴏʟᴇᴄᴄɪóɴ',
            id:
              'gacha coleccion'
          }
        ]
      })
    }

    user.gachaTickets -= 10

    const personajes = []

    for (
      let i = 0;
      i < 10;
      i++
    ) {
      const personaje =
        obtenerPersonaje()

      const imagen =
        await obtenerImagen()

      personaje.imagen =
        imagen

      personajes.push(
        personaje
      )

      user.gacha.push(
        personaje
      )
    }

    const imagenPrincipal =
      personajes.find(
        p => p.imagen
      )?.imagen || null

    const texto = `
╭━━〔 🌟 *GACHA ×10* 〕━━╮

🎉 *¡DIEZ OBTENCIONES!*

${textoDiez(
  personajes
)}

━━━━━━━━━━━━━━━━━━━━

🎟️ Tickets restantes:
*${user.gachaTickets}*

╰━━━━━━━━━━━━━━━━━━━━━━╯
`.trim()

    return enviarGacha({
      sock,
      chatId,
      msg,
      config,
      texto,
      titulo:
        '🌟 FAMILY GACHA ×10',
      imagen:
        imagenPrincipal,
      botones: [
        {
          text:
            '🔄 ×10',
          id:
            'gacha 10'
        },
        {
          text:
            '🎴 ×1',
          id:
            'gacha 1'
        },
        {
          text:
            '🎒 ᴄᴏʟᴇᴄᴄɪóɴ',
          id:
            'gacha coleccion'
        }
      ]
    })
  }

  if (
    accion === 'coleccion' ||
    accion === 'collection' ||
    accion === 'inventario'
  ) {
    if (
      !user.gacha.length
    ) {
      return enviarGacha({
        sock,
        chatId,
        msg,
        config,
        texto: `
╭━━〔 🎒 *COLECCIÓN* 〕━━╮

📭 Tu colección está vacía.

🎴 ¡Haz tu primera tirada!

╰━━━━━━━━━━━━━━━━━━━━━━╯
`.trim(),
        titulo:
          '🎒 MI COLECCIÓN',
        botones: [
          {
            text:
              '🎴 ɢᴀᴄʜᴀ ×1',
            id:
              'gacha 1'
          },
          {
            text:
              '🌟 ɢᴀᴄʜᴀ ×10',
            id:
              'gacha 10'
          }
        ]
      })
    }

    const personajes =
      [...user.gacha]
        .reverse()
        .slice(0, 10)

    const texto = `
╭━━〔 🎒 *MI COLECCIÓN* 〕━━╮

👤 @${jid.split('@')[0]}

🎴 Total:
*${user.gacha.length}*

🎟️ Tickets:
*${user.gachaTickets}*

${textoDiez(
  personajes
)}

╰━━━━━━━━━━━━━━━━━━━━━━╯
`.trim()

    const imagen =
      personajes.find(
        p => p.imagen
      )?.imagen || null

    return enviarGacha({
      sock,
      chatId,
      msg,
      config,
      texto,
      titulo:
        '🎒 MI COLECCIÓN',
      imagen,
      botones: [
        {
          text:
            '🎴 ×1',
          id:
            'gacha 1'
        },
        {
          text:
            '🌟 ×10',
          id:
            'gacha 10'
        },
        {
          text:
            '🏆 ʀᴀɴᴋɪɴɢ',
          id:
            'gacha ranking'
        }
      ]
    })
  }

  if (
    accion === 'ranking' ||
    accion === 'rank'
  ) {
    const ranking =
      obtenerRanking(db)

    if (!ranking.length) {
      return enviarGacha({
        sock,
        chatId,
        msg,
        config,
        texto: `
╭━━〔 🏆 *RANKING* 〕━━╮

📭 Todavía no hay jugadores.

🎴 ¡Sé el primero!

╰━━━━━━━━━━━━━━━━━━━━━━╯
`.trim(),
        titulo:
          '🏆 GACHA RANKING',
        botones: [
          {
            text:
              '🎴 ɢᴀᴄʜᴀ',
            id:
              'gacha 1'
          }
        ]
      })
    }

    const lista =
      ranking
        .map((usuario, indice) => {
          const numero =
            indice + 1

          const medalla =
            numero === 1
              ? '🥇'
              : numero === 2
                ? '🥈'
                : numero === 3
                  ? '🥉'
                  : '🏅'

          return (
            `${medalla} *#${numero}* ` +
            `@${usuario.jid.split('@')[0]}\n` +
            `   🎴 ${usuario.cantidad} personajes`
          )
        })
        .join('\n\n')

    const texto = `
╭━━〔 🏆 *GACHA RANKING* 〕━━╮

${lista}

╰━━━━━━━━━━━━━━━━━━━━━━╯
`.trim()

    return enviarGacha({
      sock,
      chatId,
      msg,
      config,
      texto,
      titulo:
        '🏆 GACHA RANKING',
      botones: [
        {
          text:
            '🎴 ×1',
          id:
            'gacha 1'
        },
        {
          text:
            '🌟 ×10',
          id:
            'gacha 10'
        },
        {
          text:
            '🎒 ᴄᴏʟᴇᴄᴄɪóɴ',
          id:
            'gacha coleccion'
        }
      ]
    })
  }

  return enviarGacha({
    sock,
    chatId,
    msg,
    config,
    texto: `
❌ *OPCIÓN NO ENCONTRADA*

🎴 Usa:
*${config.prefijo}gacha*
`.trim(),
    titulo:
      '🎴 FAMILY GACHA',
    botones: [
      {
        text:
          '🎴 ᴀʙʀɪʀ ɢᴀᴄʜᴀ',
        id:
          'gacha'
      }
    ]
  })
}