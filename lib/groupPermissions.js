import { getGroupMetadataCached } from './groupCache.js'
import { normalizarJid } from './utils.js'
import config from '../config.js'

export async function esAdminGrupo(sock, chatId, jid) {
  if (!chatId.endsWith('@g.us')) return false

  const metadata = await getGroupMetadataCached(sock, chatId, config.groupCacheTTL)
  const jidNormalizado = normalizarJid(jid)

  const participante = metadata.participants.find(
    (p) => normalizarJid(p.id) === jidNormalizado
  )

  return participante?.admin === 'admin' || participante?.admin === 'superadmin'
}

export async function esBotAdminGrupo(sock, chatId) {
  return esAdminGrupo(sock, chatId, sock.user.id)
}
