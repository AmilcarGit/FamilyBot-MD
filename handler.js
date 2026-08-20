import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import chalk from 'chalk'
import config from './config.js'
import { esOwner, normalizarJid, resolverNumeroReal } from './lib/utils.js'
import { esAdminGrupo } from './lib/groupPermissions.js'
import { getDB } from './lib/db.js'
import { info, warn, error as logError } from './lib/logger.js'
import { t, obtenerIdiomaUsuario } from './lib/i18n.js'
import { mostrarResumenComandos } from './lib/banner.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const commandsDir = path.join(__dirname, 'commands')

const comandos = {}
const listaComandos = []
const cooldowns = new Map()

function listarArchivosComandos(dir) {
  const resultado = []
  const entradas = fs.readdirSync(dir, { withFileTypes: true })
  for (const entrada of entradas) {
    const rutaCompleta = path.join(dir, entrada.name)
    if (entrada.isDirectory()) {
      resultado.push(...listarArchivosComandos(rutaCompleta))
    } else if (entrada.name.endsWith('.js')) {
      resultado.push(rutaCompleta)
    }
  }
  return resultado
}

function quitarComando(nombre) {
  const entradaVieja = comandos[nombre]
  if (!entradaVieja) return
  delete comandos[nombre]
  for (const a of entradaVieja.alias) delete comandos[a]
  const idx = listaComandos.findIndex((c) => c.nombre === nombre)
  if (idx !== -1) listaComandos.splice(idx, 1)
}

async function cargarComandoIndividual(rutaCompleta) {
  const nombre = path.basename(rutaCompleta, '.js')
  const relPath = path.relative(commandsDir, rutaCompleta).split(path.sep).join('/')
  const dirRelativo = path.dirname(relPath)
  const categoria = dirRelativo === '.' ? 'general' : dirRelativo

  quitarComando(nombre)
  const mod = await import(`./commands/${relPath}?update=${Date.now()}`)

  const entrada = {
    nombre,
    categoria,
    run: mod.default,
    subcomandos: mod.subcomandos || null,
    desc: mod.desc || 'Sin descripción',
    alias: mod.alias || [],
    cooldown: mod.cooldown ?? 3,
    soloOwner: mod.soloOwner || false,
    soloAdmin: mod.soloAdmin || false,
    oculto: mod.oculto || false,
  }

  comandos[nombre] = entrada
  for (const a of entrada.alias) comandos[a] = entrada
  listaComandos.push(entrada)
}

async function cargarComandos() {
  const archivos = listarArchivosComandos(commandsDir)
  for (const rutaCompleta of archivos) {
    try {
      await cargarComandoIndividual(rutaCompleta)
    } catch (err) {
      logError(`Error cargando "${rutaCompleta}":`, err)
    }
  }
  mostrarResumenComandos(listaComandos)
}

await cargarComandos()

export default async function handler(sock, m) {
  const msg = m.messages?.[0]
  if (!msg?.message) return

  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const chatId = msg.key.remoteJid

  let db
  try {
    db = await getDB()
    db.data.blacklist ??= []
    const jidNormalizado = normalizarJid(jidRemitente)
    if (db.data.blacklist.includes(jidNormalizado)) return
    db.data.users[jidNormalizado] ??= { mensajes: 0, registrado: false }
    db.data.users[jidNormalizado].mensajes++
    await db.write()
  } catch (err) {}

  const idioma = obtenerIdiomaUsuario(db, jidRemitente, config)
  const mType = Object.keys(msg.message)[0]
  const mContent = mType === 'viewOnceMessage' ? msg.message.viewOnceMessage.message : msg.message

  let texto = 
    mContent.conversation ||
    mContent.extendedTextMessage?.text ||
    mContent.imageMessage?.caption ||
    mContent.buttonsResponseMessage?.selectedButtonId ||
    mContent.templateButtonReplyMessage?.selectedId ||
    mContent.listResponseMessage?.singleSelectReply?.selectedRowId ||
    ''

  if (!texto && mContent.interactiveResponseMessage) {
    try {
      const native = mContent.interactiveResponseMessage.nativeFlowResponseMessage
      if (native?.paramsJson) {
        const params = JSON.parse(native.paramsJson)
        texto = params.id || params.selectedId || params.selectedRowId || ''
      }
    } catch (e) {}
  }

  if (!texto) return

  let cuerpo = texto
  if (config.prefijo && texto.startsWith(config.prefijo)) {
    cuerpo = texto.slice(config.prefijo.length)
  }

  const [comandoRaw, ...args] = cuerpo.trim().split(/\s+/)
  const comando = comandoRaw?.toLowerCase()
  const entrada = comando && comandos[comando]
  if (!entrada) return

  const numeroRealRemitente = await resolverNumeroReal(sock, jidRemitente, msg)
  const esDueno = esOwner(numeroRealRemitente, config.owner)

  if (entrada.soloOwner && !esDueno) return sock.sendMessage(chatId, { text: t(idioma, 'soloOwner') })

  if (entrada.soloAdmin && !esDueno) {
    const esAdmin = await esAdminGrupo(sock, chatId, jidRemitente)
    if (!esAdmin) return sock.sendMessage(chatId, { text: t(idioma, 'soloAdmin') || '🔒 Este comando es solo para administradores del grupo.' })
  }

  try {
    db.data.stats ??= { comandosEjecutados: 0 }
    db.data.stats.comandosEjecutados++
    await db.write()

    info(chalk.green('⚡ Comando:'), `${config.prefijo}${entrada.nombre}`, chalk.gray(`(${jidRemitente.split('@')[0]})`))

    await entrada.run({
      sock, msg, args, chatId, esDueno, comandos: listaComandos, config, db, idioma,
      t: (clave, vars) => t(idioma, clave, vars),
    })
  } catch (err) {
    logError(`Error en ${entrada.nombre}:`, err)
  }
}