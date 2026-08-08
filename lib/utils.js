export function normalizarJid(jid = '') {
  if (!jid) return ''
  return jid
    .replace(/:\d+/, '')
    .replace('@s.whatsapp.net', '@s.whatsapp.net')
}

export function esOwner(jid, ownerList = []) {
  const jidNormalizado = normalizarJid(jid).split('@')[0].trim()
  const listaLimpia = ownerList.map((num) => String(num).replace(/\D/g, '').trim())

  const resultado = listaLimpia.includes(jidNormalizado)

  if (!resultado) {
    console.log(
      `[esOwner] No coincide. jid recibido: "${jidNormalizado}" | owners en config: [${listaLimpia.join(', ')}]`
    )
  }

  return resultado
}

export async function resolverNumeroReal(sock, sender, msg = null) {
  const crudo = String(sender || '')
  const limpioDirecto = crudo.split('@')[0].split(':')[0].replace(/\D/g, '')

  if (!crudo.endsWith('@lid')) {
    return limpioDirecto
  }

  const alternativaEnMsg =
    msg?.key?.participantPn || msg?.key?.senderPn || msg?.key?.remoteJidPn

  if (alternativaEnMsg && !String(alternativaEnMsg).endsWith('@lid')) {
    const numeroDelMsg = String(alternativaEnMsg)
      .split('@')[0]
      .split(':')[0]
      .replace(/\D/g, '')
    if (numeroDelMsg) return numeroDelMsg
  }

  try {
    const contactos = sock?.contacts || {}

    const directo = contactos[crudo]
    const candidatoDirecto = directo?.id || directo?.jid || directo?.phoneNumber || directo?.pn
    if (candidatoDirecto && !String(candidatoDirecto).endsWith('@lid')) {
      const numeroReal = String(candidatoDirecto)
        .split('@')[0]
        .split(':')[0]
        .replace(/\D/g, '')
      if (numeroReal) return numeroReal
    }

    for (const contacto of Object.values(contactos)) {
      const camposLid = [contacto?.lid, contacto?.id, contacto?.jid]
        .filter(Boolean)
        .map((v) => String(v))

      const coincideLid = camposLid.some(
        (v) => v === crudo || v.split('@')[0] === limpioDirecto
      )
      if (!coincideLid) continue

      const candidatos = [contacto?.id, contacto?.jid, contacto?.phoneNumber, contacto?.pn]
        .filter(Boolean)
        .map((v) => String(v))
        .filter((v) => !v.endsWith('@lid'))

      if (candidatos[0]) {
        const numeroReal = candidatos[0].split('@')[0].split(':')[0].replace(/\D/g, '')
        if (numeroReal) return numeroReal
      }
    }
  } catch (_) {}

  return limpioDirecto
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function backoffDelay(intento, maxDelay) {
  const base = Math.min(1000 * 2 ** intento, maxDelay)
  return base
}

export function obtenerJidMencionado(msg, args = []) {
  const contexto = msg.message?.extendedTextMessage?.contextInfo
  if (contexto?.mentionedJid?.length) return contexto.mentionedJid[0]
  if (contexto?.participant) return contexto.participant

  const numero = args[0]?.replace(/\D/g, '')
  if (numero && numero.length >= 8) return `${numero}@s.whatsapp.net`

  return null
}

export function extraerIdYoutube(texto) {
  const patrones = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
  ]

  for (const patron of patrones) {
    const match = texto.match(patron)
    if (match) return match[1]
  }

  return null
}
