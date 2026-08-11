import { obtenerPerfilSocial, MASCOTAS_DISPONIBLES } from '../../lib/social.js'

export const desc = 'Adopta una mascota virtual'
export const cooldown = 5

export default async function adoptar({ sock, msg, args, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const perfil = await obtenerPerfilSocial(db, jidRemitente)

  if (perfil.mascota) {
    return sock.sendMessage(chatId, {
      text: `❌ Ya tienes una mascota: ${perfil.mascota.emoji} ${perfil.mascota.nombreMascota}.`,
    })
  }

  const tipo = args[0]?.toLowerCase()
  const infoTipo = MASCOTAS_DISPONIBLES[tipo]

  if (!infoTipo) {
    const lista = Object.entries(MASCOTAS_DISPONIBLES)
      .map(([id, m]) => `${m.emoji} ${id}`)
      .join('  ')

    return sock.sendMessage(chatId, {
      text: `❀ Elige un tipo de mascota:\n${lista}\n\nEjemplo: adoptar perro MiPerrito`,
    })
  }

  const nombreMascota = args.slice(1).join(' ').trim() || infoTipo.nombre

  perfil.mascota = {
    tipo,
    nombreMascota,
    nivel: 1,
    exp: 0,
    hambre: 100,
    felicidad: 100,
    ultimaActualizacion: Date.now(),
    emoji: infoTipo.emoji,
  }
  await db.write()

  await sock.sendMessage(chatId, {
    text: `🎉 Adoptaste a ${infoTipo.emoji} *${nombreMascota}* (${infoTipo.nombre}).\nCuídalo con *alimentar* y *jugarmascota*.`,
  })
}