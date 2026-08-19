
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
import { obtenerConfigChat } from './lib/groupSettings.js'
import { registrarMensaje, limpiarHistorial, MAX_MENSAJES } from './lib/floodControl.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const commandsDir = path.join(__dirname, 'commands')

const comandos = {}
const listaComandos = []
const cooldowns = new Map()
const comandosRespondidos = new Map()

setInterval(async () => {
  const ahora = Date.now()
  if (comandosRespondidos.size > 1000) {
    comandosRespondidos.clear()
  }
  
  try {
    const db = await getDB()
    if (db.data.comandosRespondidos) {
      let modificado = false
      for (const id in db.data.comandosRespondidos) {
        if (ahora - db.data.comandosRespondidos[id].timestamp > 10 * 60 * 1000) {
          delete db.data.comandosRespondidos[id]
          modificado = true
        }
      }
      if (modificado) await db.write()
    }
  } catch {}
}, 5 * 60 * 1000)

export function obtenerComandosPanel() {
  return listaComandos.map(({ nombre, categoria, desc, alias, cooldown, soloOwner, soloAdmin, oculto }) => ({
    nombre,
    categoria,
    desc,
    alias,
    cooldown,
    soloOwner,
    soloAdmin,
    oculto,
    activo: !(config.comandosDesactivados || []).includes(nombre),
  }))
}

setInterval(() => {
  const ahora = Date.now()
  for (const [clave, vencimiento] of cooldowns) {
    if (vencimiento < ahora) cooldowns.delete(clave)
  }
}, 15 * 60 * 1000)

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

async function cargarComandoIndividual(rutaCompleta, avisar = false) {
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

  if (avisar) {
    info(chalk.magenta(`♻️  Comando recargado: ${nombre}`))
  }
}

async function cargarComandos() {
  const archivos = listarArchivosComandos(commandsDir)

  for (const rutaCompleta of archivos) {
    try {
      await cargarComandoIndividual(rutaCompleta)
    } catch (err) {
      logError(`Error cargando el comando "${rutaCompleta}":`, err)
    }
  }

  mostrarResumenComandos(listaComandos)
}

function activarHotReload() {
  fs.watch(commandsDir, { recursive: true }, (evento, nombreArchivo) => {
    if (!nombreArchivo || !nombreArchivo.endsWith('.js')) return

    const rutaCompleta = path.join(commandsDir, nombreArchivo)

    if (!fs.existsSync(rutaCompleta)) {
      const nombre = path.basename(nombreArchivo, '.js')
      quitarComando(nombre)
      warn(chalk.yellow(`🗑️  Comando eliminado: ${nombre}`))
      return
    }

    setTimeout(() => {
      cargarComandoIndividual(rutaCompleta, true).catch((err) => {
        logError(`Error recargando "${nombreArchivo}":`, err)
      })
    }, 150)
  })

  info(chalk.blue('👀 Vigilando /commands para hot-reload...'))
}

await cargarComandos()
activarHotReload()

async function notificarErrorAlOwner(sock, err, comando) {
  try {
    const ownerJid = `${config.owner[0]}@s.whatsapp.net`
    await sock.sendMessage(ownerJid, {
      text: `⚠️ Error ejecutando *${config.prefijo}${comando}*:\n\n${err?.stack || err?.message || err}`,
    })
  } catch {}
}

export default async function handler(sock, m) {
  const msg = m.messages?.[0]
  if (!msg?.message) return

  const quotedMsg =
    msg.message.extendedTextMessage?.contextInfo?.quotedMessage ||
    msg.message.imageMessage?.contextInfo?.quotedMessage ||
    msg.message.videoMessage?.contextInfo?.quotedMessage ||
    msg.message.documentMessage?.contextInfo?.quotedMessage

  if (quotedMsg) {
    const stanzaId = msg.message.extendedTextMessage?.contextInfo?.stanzaId
    if (stanzaId) {
      comandosRespondidos.set(stanzaId, true)
    }
  }

  const esAutorespuesta = msg.key.fromMe

  if (esAutorespuesta) {
    const posibleTexto =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      ''

    const esComando = config.prefijo && posibleTexto.startsWith(config.prefijo)
    if (!esComando) return
  }

  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const chatId = msg.key.remoteJid

  let db
  try {
    db = await getDB()

    db.data.blacklist ??= []
    db.data.stats ??= {}
    db.data.stats.mensajesPorHora ??= Array(24).fill(0)
    const horaActual = new Date().getHours()
    db.data.stats.mensajesPorHora[horaActual] = (db.data.stats.mensajesPorHora[horaActual] || 0) + 1
    if (db.data.blacklist.includes(normalizarJid(jidRemitente))) {
      return
    }

    const jidNormalizado = normalizarJid(jidRemitente)
    db.data.users[jidNormalizado] ??= { mensajes: 0, idioma: config.idiomaPorDefecto }
    db.data.users[jidNormalizado].mensajes++
    await db.write()
  } catch (err) {
    logError('Error guardando en la base de datos:', err)
  }

  const idioma = obtenerIdiomaUsuario(db, jidRemitente, config)

  const tipoMensaje = Object.keys(msg.message)[0]
  let texto = 
    msg.message.conversation ||
    msg.message.extendedTextMessage?.text ||
    msg.message.imageMessage?.caption ||
    msg.message.buttonsResponseMessage?.selectedButtonId ||
    msg.message.templateButtonReplyMessage?.selectedId ||
    msg.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
    ''

  if (!texto && msg.message.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
    try {
      const params = JSON.parse(msg.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson)
      texto = params.id || params.selectedId || params.selectedRowId || ''
    } catch (e) {
      console.error('Error parseando paramsJson:', e)
    }
  }

  if (!texto && msg.message.interactiveResponseMessage?.body?.text) {
    texto = msg.message.interactiveResponseMessage.body.text
  }
  const esGrupo = chatId.endsWith('@g.us')
  info(
    chalk.cyan(esGrupo ? '👥 Grupo' : '👤 Privado'),
    chalk.gray(`${jidRemitente.split('@')[0]}:`),
    texto || chalk.dim(`[${tipoMensaje}]`)
  )

  if (!texto) return

  const esNumero = /^[1-9][0-9]*$/.test(texto.trim())
  const infoContexto = msg.message.extendedTextMessage?.contextInfo
  const citadoPorMi = infoContexto?.participant === sock.user.id
  
  if (infoContexto?.stanzaId) {
    comandosRespondidos.set(infoContexto.stanzaId, true)
  }

  if (esNumero && citadoPorMi) {
    const num = parseInt(texto.trim())
    if (num >= 1 && num <= 10) {
      const quotedText = msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.conversation || 
                         msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text ||
                         msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage?.caption || ''
      
      if (quotedText.includes('SPOTIFY SYSTEM') || quotedText.includes('spotify search')) {
        const cmd = comandos['sp']
        if (cmd) {
          return cmd.run({
            sock, msg, args: [texto.trim()], chatId, esDueno: esOwner(await resolverNumeroReal(sock, jidRemitente, msg), config.owner),
            comandos: listaComandos, config, db, idioma, t: (clave, vars) => t(idioma, clave, vars)
          })
        }
      }

      if (quotedText.includes('Resultados para:') && (quotedText.includes('YouTube') || quotedText.includes('yts'))) {
        const cmd = comandos['play']
        if (cmd) {
          return cmd.run({
            sock, msg, args: [texto.trim()], chatId, esDueno: esOwner(await resolverNumeroReal(sock, jidRemitente, msg), config.owner),
            comandos: listaComandos, config, db, idioma, t: (clave, vars) => t(idioma, clave, vars)
          })
        }
      }

      if (quotedText.includes('Resultados de Deezer')) {
        const cmd = comandos['dz']
        if (cmd) {
          return cmd.run({
            sock, msg, args: [texto.trim()], chatId, esDueno: esOwner(await resolverNumeroReal(sock, jidRemitente, msg), config.owner),
            comandos: listaComandos, config, db, idioma, t: (clave, vars) => t(idioma, clave, vars)
          })
        }
      }
    }
  }

  if (esGrupo) {
    const numeroMensajesRecientes = registrarMensaje(jidRemitente)

    if (numeroMensajesRecientes > MAX_MENSAJES) {
      limpiarHistorial(jidRemitente)

      const numeroReal = await resolverNumeroReal(sock, jidRemitente, msg)
      const esDuenoMsj = esOwner(numeroReal, config.owner)

      if (!esDuenoMsj) {
        const configChat = obtenerConfigChat(db, chatId)
        const jidNormalizado = normalizarJid(jidRemitente)
        configChat.advertencias[jidNormalizado] = (configChat.advertencias[jidNormalizado] || 0) + 1
        await db.write()

        await sock.sendMessage(chatId, {
          text: `🚨 @${jidRemitente.split('@')[0]} está enviando mensajes demasiado rápido. Se registró una advertencia por flood.`,
          mentions: [jidRemitente],
        })

        return
      }
    }

    const contieneLink = /chat\.whatsapp\.com\/[a-zA-Z0-9]+/i.test(texto)

    if (contieneLink) {
      const configChat = obtenerConfigChat(db, chatId)

      if (configChat.antilink) {
        const numeroReal = await resolverNumeroReal(sock, jidRemitente, msg)
        const esDuenoMsj = esOwner(numeroReal, config.owner)
        const esAdminMsj = esDuenoMsj ? true : await esAdminGrupo(sock, chatId, jidRemitente)

        if (!esDuenoMsj && !esAdminMsj) {
          try {
            await sock.sendMessage(chatId, { delete: msg.key })
          } catch {}

          await sock.sendMessage(chatId, {
            text: `🔗 @${jidRemitente.split('@')[0]} no se permiten links de invitación en este grupo.`,
            mentions: [jidRemitente],
          })

          return
        }
      }
    }
  }

  let cuerpo = texto
  if (config.prefijo && texto.startsWith(config.prefijo)) {
    cuerpo = texto.slice(config.prefijo.length)
  }

  const [comandoRaw, ...args] = cuerpo.trim().split(/\s+/)
  const comando = comandoRaw?.toLowerCase()

  const entrada = comando && comandos[comando]
  if (!entrada) return

  const prioridad = sock.isSubbot ? (config.prioridad || 1) : 0
  if (prioridad > 0) {
    await new Promise((resolve) => setTimeout(resolve, prioridad * 2000))
    
    await db.read()
    db.data.comandosRespondidos ??= {}
    if (db.data.comandosRespondidos[msg.key.id]) {
      info(chalk.yellow(`🚫 Anti-Spam: ${entrada.nombre} cancelado (ya respondido por otro bot)`))
      return
    }
  }

  db.data.comandosRespondidos ??= {}
  db.data.comandosRespondidos[msg.key.id] = {
    bot: sock.user.name || sock.user.id,
    timestamp: Date.now()
  }
  await db.write()

  const numeroRealRemitente = await resolverNumeroReal(sock, jidRemitente, msg)
  const esDueno = esOwner(numeroRealRemitente, config.owner)
  if (!esDueno && (config.comandosDesactivados || []).includes(entrada.nombre)) {
    return sock.sendMessage(chatId, { text: `⛔ El comando *${config.prefijo}${entrada.nombre}* está temporalmente desactivado.` })
  }

  const categoriasSinRegistro = ['main', 'owner']
  if (!esDueno && !categoriasSinRegistro.includes(entrada.categoria)) {
    const jidNormalizado = normalizarJid(jidRemitente)
    const usuarioDB = db.data.users[jidNormalizado]

    if (!usuarioDB?.registrado) {
      return sock.sendMessage(chatId, {
        text:
          `📝 Debes registrarte antes de usar comandos.\n\n` +
          `Usa: *${config.prefijo}reg Nombre.Edad*\n` +
          `Ejemplo: *${config.prefijo}reg Amilcar.21*`,
      })
    }
  }

  if (entrada.soloOwner && !esDueno) {
    return sock.sendMessage(chatId, { text: t(idioma, 'soloOwner') })
  }

  if (entrada.soloAdmin && !esDueno) {
    const esAdmin = await esAdminGrupo(sock, chatId, jidRemitente)
    if (!esAdmin) {
      return sock.sendMessage(chatId, { text: t(idioma, 'soloAdmin') })
    }
  }

  if (entrada.cooldown > 0 && !esDueno) {
    const clave = `${entrada.nombre}:${jidRemitente}`
    const ahora = Date.now()
    const vencimiento = cooldowns.get(clave)

    if (vencimiento && ahora < vencimiento) {
      const restante = Math.ceil((vencimiento - ahora) / 1000)
      return sock.sendMessage(chatId, {
        text: t(idioma, 'cooldown', { restante, prefijo: config.prefijo, comando: entrada.nombre }),
      })
    }
    cooldowns.set(clave, ahora + entrada.cooldown * 1000)
  }

  let ejecutar = entrada.run
  let argsFinal = args

  if (entrada.subcomandos && args[0]) {
    const nombreSub = args[0].toLowerCase()
    if (entrada.subcomandos[nombreSub]) {
      ejecutar = entrada.subcomandos[nombreSub]
      argsFinal = args.slice(1)
    }
  }

  try {
    db.data.stats ??= { comandosEjecutados: 0 }
    db.data.stats.comandosEjecutados = (db.data.stats.comandosEjecutados || 0) + 1
    db.data.stats.comandosPorNombre ??= {}
    db.data.stats.comandosPorNombre[entrada.nombre] = (db.data.stats.comandosPorNombre[entrada.nombre] || 0) + 1
    await db.write()

    info(
      chalk.green('⚡ Comando:'),
      `${config.prefijo}${entrada.nombre}`,
      chalk.gray(`(${jidRemitente.split('@')[0]})`)
    )

    await ejecutar({
      sock,
      msg,
      args: argsFinal,
      chatId,
      esDueno,
      comandos: listaComandos,
      config: { ...config, prioridad: sock.isSubbot ? (config.prioridad || 1) : 0 },
      db,
      idioma,
      t: (clave, vars) => t(idioma, clave, vars),
    })
  } catch (err) {
    logError(`Error en el comando "${entrada.nombre}":`, err)
    await notificarErrorAlOwner(sock, err, entrada.nombre)
  }
}
