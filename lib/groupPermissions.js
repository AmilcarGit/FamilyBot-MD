import { getGroupMetadataCached } from './groupCache.js'
import { normalizarJid } from './utils.js'
import config from '../config.js'

export async function esAdminGrupo(sock, chatId, jid) {
  if (!chatId.endsWith('@g.us')) return false

  const metadata = await getGroupMetadataCached(sock, chatId, config.groupCacheTTL)
  const numeroBuscado = normalizarJid(jid).split('@')[0]

  const participante = metadata.participants.find((p) => {
    const candidatos = [p.id, p.lid, p.jid]
      .filter(Boolean)
      .map((v) => normalizarJid(v).split('@')[0])
    return candidatos.includes(numeroBuscado)
  })

  return participante?.admin === 'admin' || participante?.admin === 'superadmin'
}

export async function esBotAdminGrupo(sock, chatId) {
  const candidatosPropios = [
    sock.user?.id,
    sock.user?.lid,
    sock.authState?.creds?.me?.lid,
  ].filter(Boolean)

  for (const candidato of candidatosPropios) {
    const esAdmin = await esAdminGrupo(sock, chatId, candidato)
    if (esAdmin) return true
  }

  return false
}
