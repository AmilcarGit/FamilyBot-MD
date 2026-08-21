import { normalizarJid } from '../../lib/utils.js'

export const desc = 'Regístrate para poder usar los comandos del bot'
export const alias = ['register', 'registrar']
export const cooldown = 3

export default async function reg({ sock, msg, args, chatId, db, config }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const jidNormalizado = normalizarJid(jidRemitente)

  db.data.users[jidNormalizado] ??= { mensajes: 0, idioma: config.idiomaPorDefecto }
  const usuario = db.data.users[jidNormalizado]

  if (usuario.registrado) {
    return sock.sendMessage(chatId, {
      text: `✅ Ya estás registrado como *${usuario.nombre}*, ${usuario.edad} años.`,
    })
  }

  const entrada = args.join(' ').trim()
  const partes = entrada.split('.')

  if (partes.length !== 2 || !partes[0].trim() || !partes[1].trim()) {
    return sock.sendMessage(chatId, {
      text:
        `📝 *Registro*\n\n` +
        `Uso: *${config.prefijo}reg Nombre.Edad*\n` +
        `Ejemplo: *${config.prefijo}reg Amilcar.21*`,
    })
  }

  const nombre = partes[0].trim()
  const edad = parseInt(partes[1].trim(), 10)

  if (nombre.length < 2 || nombre.length > 30) {
    return sock.sendMessage(chatId, { text: '❌ El nombre debe tener entre 2 y 30 caracteres.' })
  }

  if (!edad || edad < 8 || edad > 99) {
    return sock.sendMessage(chatId, { text: '❌ Escribe una edad válida entre 8 y 99 años.' })
  }

  usuario.registrado = true
  usuario.nombre = nombre
  usuario.edad = edad
  usuario.fechaRegistro = Date.now()

  usuario.economia ??= {
    saldo: 500,
    banco: 0,
    ultimoMinar: 0,
    ultimoTrabajar: 0,
    ultimoCosechar: 0,
    ultimoRobar: 0,
    ultimoDiario: 0,
    racha: 0,
  }

  await db.write()

  await sock.sendMessage(chatId, {
    text:
      `🎉 *¡Registro exitoso!* 💕🌹\n\n` +
      `👤 Nombre: ${nombre}\n` +
      `🎂 Edad: ${edad}\n` +
      `💵 Bono de bienvenida: 500\n\n` +
      `Ya puedes usar todos los comandos de *FamilyBot-MD* 👑`,
  })
}
