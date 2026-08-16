import express from 'express'
import fs from 'fs'
import path from 'path'
import { getDB } from './db.js'
import { listarSubbots, detenerSubbot } from '../subbots/manager.js'
import { obtenerComandosPanel } from '../handler.js'
import config from '../config.js'
import { randomBytes, timingSafeEqual } from 'crypto'
import { exec } from 'child_process'

let sockActivo = null
let tokenUnico = null
const logsBuffer = []
const MAX_LOGS = 100
const COMANDOS_TERMINAL_SEGUROS = new Set(['node -v', 'npm -v', 'npm list --depth=0', 'uptime', 'free -h', 'df -h'])
// El owner principal ya no se fija aquí; se toma de config.owner[0] de cada instalación

const intentosLogin = new Map()
const MAX_INTENTOS_LOGIN = 5
const BLOQUEO_LOGIN_MS = 5 * 60 * 1000

function esc(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function tokensCoinciden(a, b) {
  const bufA = Buffer.from(String(a || ''))
  const bufB = Buffer.from(String(b || ''))
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

function ipDe(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'desconocida'
}

function loginBloqueado(ip) {
  const registro = intentosLogin.get(ip)
  if (!registro) return false
  if (registro.bloqueadoHasta && registro.bloqueadoHasta > Date.now()) return true
  return false
}

function registrarIntentoFallido(ip) {
  const registro = intentosLogin.get(ip) || { fallos: 0, bloqueadoHasta: 0 }
  registro.fallos++
  if (registro.fallos >= MAX_INTENTOS_LOGIN) {
    registro.bloqueadoHasta = Date.now() + BLOQUEO_LOGIN_MS
    registro.fallos = 0
  }
  intentosLogin.set(ip, registro)
}

function limpiarIntentos(ip) {
  intentosLogin.delete(ip)
}

const originalLog = console.log
console.log = (...args) => {
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')
  logsBuffer.push({ time: new Date().toLocaleTimeString(), msg })
  if (logsBuffer.length > MAX_LOGS) logsBuffer.shift()
  originalLog.apply(console, args)
}

const alertsBuffer = []
const MAX_ALERTS = 50
let contadorBadMac = 0
let ultimoBadMac = null

const originalError = console.error
console.error = (...args) => {
  const msg = args.map(a => a instanceof Error ? a.message : (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ')
  if (msg.includes('Bad MAC')) {
    contadorBadMac++
    ultimoBadMac = new Date().toLocaleString('es-PE')
  }
  alertsBuffer.push({ time: new Date().toLocaleTimeString(), msg, tipo: msg.includes('Bad MAC') ? 'badmac' : 'error' })
  if (alertsBuffer.length > MAX_ALERTS) alertsBuffer.shift()
  originalError.apply(console, args)
}

export function establecerSockActivo(sock) {
  sockActivo = sock
}

function guardarConfig(nuevoConfig) {
  const rutaConfig = path.join(process.cwd(), 'config.js')
  const contenido = `export default ${JSON.stringify(nuevoConfig, null, 2)}\n`
  fs.writeFileSync(rutaConfig, contenido)
  Object.assign(config, nuevoConfig)
}

function obtenerToken() {
  if (tokenUnico) return tokenUnico

  const rutaTokenLocal = path.join(process.cwd(), '.panel-token')

  if (fs.existsSync(rutaTokenLocal)) {
    const guardado = fs.readFileSync(rutaTokenLocal, 'utf-8').trim()
    if (guardado) {
      tokenUnico = guardado
      return tokenUnico
    }
  }

  const tokenActual = config.panelToken
  const esTokenDefault = !tokenActual || tokenActual === 'auto' || tokenActual === 'yui-token-generado' || tokenActual.startsWith('yui2026')

  tokenUnico = esTokenDefault ? 'yui-' + randomBytes(4).toString('hex') : tokenActual

  try {
    fs.writeFileSync(rutaTokenLocal, tokenUnico)
  } catch (e) {
    console.log('⚠️ No se pudo guardar el token en .panel-token:', e.message)
  }

  if (config.panelToken !== 'auto') {
    config.panelToken = 'auto'
    guardarConfig(config)
  }

  return tokenUnico
}

function verificarToken(req, res, next) {
  const token = req.query.token || req.headers['x-panel-token'] || req.body?.token
  if (!tokensCoinciden(token, obtenerToken())) {
    return res.status(401).json({ error: 'Token inválido' })
  }
  next()
}

function iconoTab(tab) {
  const iconos = {
    dash: '🏠', users: '👥', config: '⚙️', cmds: '🧩',
    subs: '🤖', bc: '📢', term: '💻', stats: '📊', alerts: '🚨',
  }
  return iconos[tab] || '▫️'
}

function renderPagina(token, tab = 'dash', extra = {}) {
  const t = esc(token)
  const tabs = [
    ['dash', 'Inicio'], ['stats', 'Estadísticas'], ['alerts', 'Alertas'], ['users', 'Usuarios'],
    ['config', 'Config'], ['cmds', 'Comandos'], ['subs', 'SubBots'],
    ['bc', 'Anuncio'], ['term', 'Terminal'],
  ]

  const menu = `
    <div class="nav">
        ${tabs.map(([id, nombre]) => `
          <a href="/?token=${t}&tab=${id}" class="${tab === id ? 'active' : ''}">${iconoTab(id)} ${nombre}</a>
        `).join('')}
    </div>
  `

  let content = ''

  if (tab === 'dash') {
    const stats = extra.stats || {}
    content = `
      <div class="grid grid-4">
          <div class="stat"><small>UPTIME</small><br><b>${formatUptime(process.uptime())}</b></div>
          <div class="stat stat-blue"><small>RAM</small><br><b>${(process.memoryUsage().rss / 1024 / 1024).toFixed(1)} MB</b></div>
          <div class="stat stat-green"><small>USUARIOS</small><br><b>${stats.usuarios ?? '—'}</b></div>
          <div class="stat stat-purple"><small>GRUPOS</small><br><b>${stats.grupos ?? '—'}</b></div>
      </div>
      <div class="card">
          <h3 class="card-title">📟 Consola en vivo</h3>
          <div class="term">${logsBuffer.map(l => `<div><span class="term-time">[${esc(l.time)}]</span> ${esc(l.msg)}</div>`).join('') || '<div class="term-empty">Sin actividad reciente todavía...</div>'}</div>
      </div>
    `
  } else if (tab === 'stats') {
    const mensajesPorHora = extra.mensajesPorHora || Array(24).fill(0)
    const maxHora = Math.max(1, ...mensajesPorHora)
    const topComandos = extra.topComandos || []
    const totalComandos = extra.totalComandos ?? 0
    const topEconomia = extra.topEconomia || []
    const gruposInfo = extra.gruposInfo || { total: 0, conAntilink: 0, conBienvenida: 0 }

    content = `
      <div class="grid grid-2">
          <div class="stat stat-pink"><small>COMANDOS EJECUTADOS (TOTAL)</small><br><b>${totalComandos}</b></div>
          <div class="stat stat-blue"><small>MENSAJES HOY</small><br><b>${mensajesPorHora.reduce((a, b) => a + b, 0)}</b></div>
      </div>
      <div class="card">
          <h3 class="card-title">📊 Mensajes por hora (hoy)</h3>
          <div class="chart">
              ${mensajesPorHora.map((v, h) => `
                <div class="bar-col">
                    <div class="bar" style="height:${Math.max(2, (v / maxHora) * 100)}%" title="${v} mensajes a las ${h}:00"></div>
                    <small>${h}</small>
                </div>
              `).join('')}
          </div>
      </div>
      <div class="card">
          <h3 class="card-title">🏆 Comandos más usados</h3>
          ${topComandos.length ? `
            <table>
                <tr><th>Comando</th><th>Usos</th></tr>
                ${topComandos.map(([nombre, usos]) => `
                  <tr><td>.${esc(nombre)}</td><td>${usos}</td></tr>
                `).join('')}
            </table>
          ` : '<p class="muted">Todavía no hay comandos registrados.</p>'}
      </div>
      <div class="card">
          <h3 class="card-title">💰 Ranking de economía</h3>
          ${topEconomia.length ? `
            <table>
                <tr><th>#</th><th>Usuario</th><th>Total</th></tr>
                ${topEconomia.map((u, i) => `
                  <tr><td>${i + 1}</td><td>${esc(u.numero)}</td><td>${u.total}</td></tr>
                `).join('')}
            </table>
          ` : '<p class="muted">Todavía no hay economía registrada.</p>'}
      </div>
      <div class="grid grid-2">
          <div class="stat stat-green"><small>GRUPOS TOTALES</small><br><b>${gruposInfo.total}</b></div>
          <div class="stat stat-purple"><small>CON ANTILINK</small><br><b>${gruposInfo.conAntilink}</b></div>
      </div>
    `
  } else if (tab === 'alerts') {
    const alertas = extra.alertas || []
    content = `
      <div class="grid grid-2">
          <div class="stat stat-purple"><small>ERRORES BAD MAC (TOTAL)</small><br><b>${extra.badMacCount ?? 0}</b></div>
          <div class="stat stat-pink"><small>ÚLTIMO BAD MAC</small><br><b style="font-size:11px">${extra.ultimoBadMac ? esc(extra.ultimoBadMac) : 'Ninguno registrado'}</b></div>
      </div>
      <div class="card">
          <h3 class="card-title">🚨 Errores recientes</h3>
          <div class="term">${alertas.length ? alertas.slice().reverse().map(a => `
              <div class="${a.tipo === 'badmac' ? 'alert-badmac' : 'alert-error'}"><span class="term-time">[${esc(a.time)}]</span> ${esc(a.msg)}</div>
            `).join('') : '<div class="term-empty">Sin errores registrados, todo tranquilo por acá 🌸</div>'}</div>
      </div>
    `
  } else if (tab === 'users') {
    const users = extra.users || {}
    const claves = Object.keys(users)
    content = `
      <div class="card">
          <h3 class="card-title">👥 Usuarios (${claves.length})</h3>
          ${claves.length ? `
            <table>
                <tr><th>Número</th><th>Acción</th></tr>
                ${claves.map(k => `
                  <tr>
                      <td>${esc(k.split('@')[0])}</td>
                      <td>
                          <form action="/action/ban" method="POST" style="margin:0">
                              <input type="hidden" name="token" value="${t}">
                              <input type="hidden" name="jid" value="${esc(k)}">
                              <input type="hidden" name="banned" value="${!users[k].banned}">
                              <button type="submit" class="btn-s ${users[k].banned ? 'btn-green' : 'btn-red'}">${users[k].banned ? 'DESBLOQUEAR' : 'BLOQUEAR'}</button>
                          </form>
                      </td>
                  </tr>
                `).join('')}
            </table>
          ` : '<p class="muted">Todavía no hay usuarios registrados.</p>'}
      </div>
    `
  } else if (tab === 'config') {
    const ownersSecundarios = (config.owner || []).slice(1)
    const bienvenida = config.bienvenida || {}
    content = `
      <div class="card card-narrow">
          <h3 class="card-title">⚙️ Configuración</h3>
          <form action="/action/config" method="POST">
              <input type="hidden" name="token" value="${t}">
              <label class="label-blue">Identidad del Bot (fija en config.js)</label>
              <input value="${esc(config.nombreBot)}" disabled class="input-locked-blue">
              <label>Prefijo</label><input name="prefijo" value="${esc(config.prefijo)}">
              <label>Idioma por defecto</label>
              <select name="idiomaPorDefecto">
                  <option value="es" ${config.idiomaPorDefecto === 'es' ? 'selected' : ''}>Español</option>
                  <option value="en" ${config.idiomaPorDefecto === 'en' ? 'selected' : ''}>English</option>
                  <option value="pt" ${config.idiomaPorDefecto === 'pt' ? 'selected' : ''}>Português</option>
              </select>
              <label>Prioridad de Respuesta (0 = Principal)</label>
              <input type="number" name="prioridad" value="${config.prioridad || 0}" min="0" max="10">

              <h4 class="subtitle">👑 Owners</h4>
              <label class="label-pink">Owner Principal (Creador, no se puede cambiar)</label>
              <input value="${esc(config.owner[0] || '')}" disabled class="input-locked-pink">
              <div id="owner-fields">
                  ${ownersSecundarios.map((num, idx) => `
                    <input name="owner_${idx}" value="${esc(num)}" placeholder="Número de owner adicional">
                  `).join('')}
                  <input name="owner_new_1" placeholder="Agregar owner — número">
                  <input name="owner_new_2" placeholder="Agregar owner — número">
              </div>

              <h4 class="subtitle">👮 Gestión de Staff</h4>
              <div id="staff-fields">
                  ${(config.staff || []).map((s, idx) => `
                    <div class="staff-row">
                        <input name="staff_n_${idx}" value="${esc(s.nombre)}" placeholder="Nombre">
                        <input name="staff_u_${idx}" value="${esc(s.numero)}" placeholder="Número">
                    </div>
                  `).join('')}
                  <div class="staff-row">
                      <input name="staff_n_new1" placeholder="Nuevo staff — nombre">
                      <input name="staff_u_new1" placeholder="Nuevo staff — número">
                  </div>
                  <div class="staff-row">
                      <input name="staff_n_new2" placeholder="Nuevo staff — nombre">
                      <input name="staff_u_new2" placeholder="Nuevo staff — número">
                  </div>
                  <div class="staff-row">
                      <input name="staff_n_new3" placeholder="Nuevo staff — nombre">
                      <input name="staff_u_new3" placeholder="Nuevo staff — número">
                  </div>
              </div>

              <h4 class="subtitle">👋 Bienvenida de grupos</h4>
              <label>
                  <input type="checkbox" name="bienvenidaActiva" value="true" ${bienvenida.activa ? 'checked' : ''} style="width:auto;display:inline-block;margin-right:6px">
                  Activar mensajes de bienvenida/despedida
              </label>
              <label>Mensaje de entrada (usa {mention} y {grupo})</label>
              <textarea name="mensajeEntrada" rows="3">${esc(bienvenida.mensajeEntrada || '')}</textarea>
              <label>Mensaje de salida (usa {mention} y {grupo})</label>
              <textarea name="mensajeSalida" rows="3">${esc(bienvenida.mensajeSalida || '')}</textarea>

              <h4 class="subtitle">🤖 Límites de Sub-Bots</h4>
              <label>Máximo de sub-bots totales</label>
              <input type="number" name="maxSubbots" value="${config.maxSubbots || 5}" min="0" max="50">
              <label>Sub-bots permitidos por usuario</label>
              <input type="number" name="subbotsPorUsuario" value="${config.subbotsPorUsuario || 1}" min="0" max="10">

              <button type="submit" class="btn">Guardar cambios</button>
          </form>
      </div>
    `
  } else if (tab === 'cmds') {
    const cmds = obtenerComandosPanel()
    content = `
      <div class="card">
          <h3 class="card-title">🧩 Comandos (${cmds.length})</h3>
          <table>
              <tr><th>Nombre</th><th>Estado</th></tr>
              ${cmds.map(c => `
                <tr>
                    <td>.${esc(c.nombre)}</td>
                    <td>
                        <form action="/action/toggle" method="POST" style="margin:0">
                            <input type="hidden" name="token" value="${t}">
                            <input type="hidden" name="nombre" value="${esc(c.nombre)}">
                            <input type="hidden" name="activo" value="${!c.activo}">
                            <button type="submit" class="btn-s ${c.activo ? 'btn-green' : 'btn-red'}">${c.activo ? 'ACTIVO' : 'APAGADO'}</button>
                        </form>
                    </td>
                </tr>
              `).join('')}
          </table>
      </div>
    `
  } else if (tab === 'subs') {
    const subs = (listarSubbots ? listarSubbots() : [])
    content = `
      <div class="card">
          <h3 class="card-title">🤖 Sub-Bots (${subs.length})</h3>
          ${subs.length ? `
            <div class="grid grid-2">
                ${subs.map(s => `
                  <div class="stat">
                      <small>${esc(s.jid || 'SUB')}</small><br>
                      <form action="/action/stop" method="POST" style="margin-top:8px">
                          <input type="hidden" name="token" value="${t}">
                          <input type="hidden" name="jid" value="${esc(s.jid)}">
                          <button type="submit" class="btn-s btn-red">DETENER</button>
                      </form>
                  </div>
                `).join('')}
            </div>
          ` : '<p class="muted">No hay sub-bots conectados.</p>'}
      </div>
    `
  } else if (tab === 'bc') {
    content = `
      <div class="card card-narrow">
          <h3 class="card-title">📢 Anuncio Global</h3>
          <p class="muted">Se enviará a todos los chats donde el bot tiene actividad registrada.</p>
          <form action="/action/bc" method="POST">
              <input type="hidden" name="token" value="${t}">
              <textarea name="mensaje" placeholder="Escribe aquí el anuncio..." rows="5"></textarea>
              <button type="submit" class="btn">Enviar a todos</button>
          </form>
      </div>
    `
  } else if (tab === 'term') {
    content = `
      <div class="card">
          <h3 class="card-title">💻 Terminal (comandos seguros)</h3>
          <form action="/action/term" method="POST">
              <input type="hidden" name="token" value="${t}">
              <select name="cmd">
                  <option value="uptime">Uptime</option>
                  <option value="free -h">RAM (free -h)</option>
                  <option value="df -h">Disco (df -h)</option>
                  <option value="node -v">Versión de Node</option>
                  <option value="npm list --depth=0">Dependencias instaladas</option>
              </select>
              <button type="submit" class="btn">Ejecutar</button>
          </form>
          ${extra.output ? `<pre class="term term-output">${esc(extra.output)}</pre>` : ''}
      </div>
    `
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TheYui-MD · Panel</title>
    <style>
        :root {
            --bg: #060609; --panel: #0d0d16; --border: #1d1d2a;
            --pink: #ff2d95; --blue: #00d4ff; --green: #2ee6a6; --purple: #a78bfa;
            --text: #eaeaf0; --muted: #6b6b7d;
        }
        * { box-sizing: border-box; }
        body {
            background: radial-gradient(circle at top, #10101c 0%, var(--bg) 60%);
            color: var(--text); font-family: 'Segoe UI', system-ui, sans-serif;
            margin: 0; padding: 16px; padding-bottom: 40px;
        }
        .topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
        .brand { display: flex; align-items: center; gap: 10px; }
        .brand h2 { margin: 0; font-size: 18px; letter-spacing: 1px; color: var(--blue); text-shadow: 0 0 12px rgba(0,212,255,.4); }
        .brand span { font-size: 20px; }
        .nav { display: flex; gap: 6px; overflow-x: auto; margin-bottom: 18px; padding-bottom: 6px; scrollbar-width: thin; }
        .nav a {
            padding: 9px 14px; background: var(--panel); color: var(--muted); text-decoration: none;
            border-radius: 10px; font-size: 12px; border: 1px solid var(--border); white-space: nowrap;
            transition: all .15s ease;
        }
        .nav a.active { background: var(--blue); color: #000; font-weight: 700; border-color: var(--blue); }
        .nav a:hover:not(.active) { border-color: var(--blue); color: var(--text); }
        .card { background: var(--panel); padding: 18px; border-radius: 14px; border: 1px solid var(--border); margin-bottom: 16px; }
        .card-narrow { max-width: 420px; margin-left: auto; margin-right: auto; }
        .card-title { color: var(--pink); font-size: 13px; margin: 0 0 14px 0; text-transform: uppercase; letter-spacing: .5px; }
        .subtitle { margin: 22px 0 10px 0; color: var(--pink); font-size: 12px; text-transform: uppercase; }
        .muted { color: var(--muted); font-size: 12px; }
        .grid { display: grid; gap: 10px; }
        .grid-2 { grid-template-columns: 1fr 1fr; }
        .grid-4 { grid-template-columns: repeat(2, 1fr); }
        @media (min-width: 500px) { .grid-4 { grid-template-columns: repeat(4, 1fr); } }
        .stat { background: #111120; padding: 14px; border-radius: 10px; border-left: 3px solid var(--pink); }
        .stat-blue { border-left-color: var(--blue); }
        .stat-green { border-left-color: var(--green); }
        .stat-purple { border-left-color: var(--purple); }
        .stat-pink { border-left-color: var(--pink); }
        .stat small { font-size: 9px; color: var(--muted); letter-spacing: .5px; }
        .stat b { font-size: 16px; }
        .term { background: #000; color: var(--green); padding: 12px; font-family: 'Cascadia Code', monospace; height: 220px; overflow: auto; font-size: 11px; border-radius: 8px; border: 1px solid var(--border); }
        .term-time { color: var(--blue); }
        .term-empty { color: var(--muted); }
        .term-output { height: auto; max-height: 200px; color: var(--blue); margin-top: 12px; white-space: pre-wrap; }
        input, select, textarea {
            width: 100%; padding: 12px; margin-bottom: 12px; background: #000; color: #fff;
            border: 1px solid var(--border); border-radius: 8px; font-size: 13px;
        }
        input:focus, select:focus, textarea:focus { outline: none; border-color: var(--blue); }
        textarea { resize: vertical; font-family: inherit; }
        label { font-size: 10px; color: var(--muted); display: block; margin-bottom: 4px; text-transform: uppercase; letter-spacing: .5px; }
        .label-blue { color: var(--blue); }
        .label-pink { color: var(--pink); }
        .input-locked-blue { opacity: .6; border-color: var(--blue); }
        .input-locked-pink { opacity: .6; border-color: var(--pink); }
        .staff-row { display: flex; gap: 8px; margin-bottom: 8px; }
        .staff-row input { margin: 0; flex: 1; }
        .btn { width: 100%; padding: 13px; background: linear-gradient(135deg, var(--pink), #ff5fb3); color: #fff; border: none; font-weight: 700; border-radius: 10px; cursor: pointer; text-transform: uppercase; font-size: 12px; letter-spacing: .5px; }
        .btn:hover { filter: brightness(1.1); }
        .btn-s { padding: 7px 14px; border-radius: 8px; border: none; cursor: pointer; font-size: 10px; font-weight: 700; color: #fff; text-transform: uppercase; }
        .btn-green { background: var(--green); color: #000; }
        .btn-red { background: #ff4d6d; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { text-align: left; color: var(--muted); padding: 8px; border-bottom: 1px solid var(--border); font-size: 10px; text-transform: uppercase; }
        td { padding: 8px; border-bottom: 1px solid #16161f; }
        .chart { display: flex; align-items: flex-end; gap: 3px; height: 140px; padding-top: 10px; }
        .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; }
        .bar { width: 100%; background: linear-gradient(180deg, var(--blue), var(--pink)); border-radius: 3px 3px 0 0; min-height: 2px; }
        .bar-col small { font-size: 8px; color: var(--muted); margin-top: 4px; }
        .alert-error { color: #ff8fa3; }
        .alert-badmac { color: #ff4d6d; font-weight: 700; }

        .fondo-decorativo { position: fixed; inset: 0; overflow: hidden; pointer-events: none; z-index: 0; }
        .flotante { position: absolute; bottom: -40px; font-size: 22px; opacity: .35; animation: flotar linear infinite; filter: drop-shadow(0 0 6px rgba(255,45,149,.25)); }
        @keyframes flotar {
            0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
            10% { opacity: .35; }
            90% { opacity: .35; }
            100% { transform: translateY(-110vh) translateX(var(--drift, 40px)) rotate(360deg); opacity: 0; }
        }
        .topbar, .nav, .card, .grid { position: relative; z-index: 1; }

        .particula { position: fixed; pointer-events: none; font-size: 16px; z-index: 999; animation: particulaFlotar .9s ease-out forwards; }
        @keyframes particulaFlotar {
            0% { transform: translate(0, 0) scale(0.6); opacity: 1; }
            100% { transform: translate(var(--px, 0px), -60px) scale(1.3); opacity: 0; }
        }
    </style>
</head>
<body>
    <div class="fondo-decorativo" id="fondoDecorativo"></div>
    <div class="topbar">
        <div class="brand"><span>🦋</span><h2>THEYUI-MD · PANEL</h2></div>
        <form action="/action/restart" method="POST" style="margin:0">
            <input type="hidden" name="token" value="${t}">
            <button type="submit" class="btn-s btn-red">REINICIAR</button>
        </form>
    </div>
    ${menu}
    ${content}
    <script>
        var tk = "${t}";
        async function sync() {
            try {
                var lr = await fetch('/api/logs?token=' + encodeURIComponent(tk));
                var lgs = await lr.json();
                var box = document.querySelector('.term:not(.term-output)');
                if (box) {
                    box.innerHTML = lgs.map(function(x) {
                        return '<div><span class="term-time">[' + x.time + ']</span> ' + x.msg + '</div>';
                    }).join('') || '<div class="term-empty">Sin actividad reciente todavía...</div>';
                    box.scrollTop = box.scrollHeight;
                }
            } catch (e) {}
        }
        if (window.location.search.includes('tab=dash') || !window.location.search.includes('tab')) {
            setInterval(sync, 2000);
            sync();
        }

        var emojisFlotantes = ['🦋', '🌸', '🌾', '✨', '🌈', '🦋', '🌸'];
        var fondo = document.getElementById('fondoDecorativo');
        function crearFlotante() {
            var el = document.createElement('div');
            el.className = 'flotante';
            el.textContent = emojisFlotantes[Math.floor(Math.random() * emojisFlotantes.length)];
            el.style.left = Math.random() * 100 + 'vw';
            el.style.setProperty('--drift', (Math.random() * 120 - 60) + 'px');
            var duracion = 12 + Math.random() * 10;
            el.style.animationDuration = duracion + 's';
            el.style.fontSize = (16 + Math.random() * 14) + 'px';
            fondo.appendChild(el);
            setTimeout(function () { el.remove(); }, duracion * 1000);
        }
        for (var i = 0; i < 6; i++) setTimeout(crearFlotante, i * 1500);
        setInterval(crearFlotante, 2200);

        var emojisClick = ['🦋', '🌸', '✨', '🌈', '🌾'];
        document.addEventListener('click', function (e) {
            var el = e.target.closest('button, a.nav-tab, .nav a');
            if (!el) return;
            for (var i = 0; i < 6; i++) {
                var p = document.createElement('div');
                p.className = 'particula';
                p.textContent = emojisClick[Math.floor(Math.random() * emojisClick.length)];
                var rect = el.getBoundingClientRect();
                p.style.left = (rect.left + rect.width / 2) + 'px';
                p.style.top = (rect.top + rect.height / 2) + 'px';
                p.style.setProperty('--px', (Math.random() * 80 - 40) + 'px');
                document.body.appendChild(p);
                setTimeout(function (nodo) { return function () { nodo.remove(); }; }(p), 900);
            }
        });
    </script>
</body>
</html>`
}

function formatUptime(segundos) {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = Math.floor(segundos % 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function obtenerResumenPanel() {
  return {
    badMacCount: contadorBadMac,
    ultimoBadMac,
    alertasRecientes: alertsBuffer.slice(-5),
    panelPort: config.panelPort,
    panelActivo: !!config.panelActivo,
    token: obtenerToken(),
  }
}

export function iniciarPanel() {
  if (!config.panelActivo) return
  const app = express()
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  app.get('/', async (req, res) => {
    const token = req.query.token
    const tab = req.query.tab || 'dash'
    const realToken = obtenerToken()
    if (!token || !tokensCoinciden(token, realToken)) {
      return res.send(paginaLogin())
    }

    if (tab === 'users') {
      const db = await getDB()
      return res.send(renderPagina(token, 'users', { users: db.data.users }))
    }

    if (tab === 'stats') {
      const db = await getDB()
      const stats = db.data.stats || {}
      const topComandos = Object.entries(stats.comandosPorNombre || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)

      const usuarios = Object.entries(db.data.users || {})
        .filter(([, u]) => u.economia)
        .map(([jid, u]) => ({ numero: jid.split('@')[0], total: (u.economia.saldo || 0) + (u.economia.banco || 0) }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)

      const chats = Object.entries(db.data.chats || {})
      const grupos = chats.filter(([id]) => id.endsWith('@g.us'))
      const gruposInfo = {
        total: grupos.length,
        conAntilink: grupos.filter(([, c]) => c.antilink).length,
        conBienvenida: grupos.filter(([, c]) => c.bienvenida).length,
      }

      return res.send(renderPagina(token, 'stats', {
        mensajesPorHora: stats.mensajesPorHora,
        topComandos,
        totalComandos: stats.comandosEjecutados || 0,
        topEconomia: usuarios,
        gruposInfo,
      }))
    }

    if (tab === 'alerts') {
      return res.send(renderPagina(token, 'alerts', {
        alertas: alertsBuffer,
        badMacCount: contadorBadMac,
        ultimoBadMac,
      }))
    }

    if (tab === 'dash') {
      const db = await getDB()
      const grupos = Object.keys(db.data.chats || {}).filter(c => c.endsWith('@g.us')).length
      const usuarios = Object.keys(db.data.users || {}).length
      return res.send(renderPagina(token, 'dash', { stats: { grupos, usuarios } }))
    }

    res.send(renderPagina(token, tab))
  })

  app.post('/login', (req, res) => {
    const ip = ipDe(req)
    if (loginBloqueado(ip)) {
      return res.status(429).send(paginaLogin('⛔ Demasiados intentos. Espera unos minutos.'))
    }
    const token = req.body.token
    if (tokensCoinciden(token, obtenerToken())) {
      limpiarIntentos(ip)
      res.redirect(`/?token=${encodeURIComponent(token)}`)
    } else {
      registrarIntentoFallido(ip)
      res.status(401).send(paginaLogin('❌ Token incorrecto'))
    }
  })

  app.post('/action/config', (req, res) => {
    const { token, prefijo, prioridad, idiomaPorDefecto, bienvenidaActiva, mensajeEntrada, mensajeSalida, maxSubbots, subbotsPorUsuario } = req.body
    if (!tokensCoinciden(token, obtenerToken())) return res.status(401).send('Error')

    const nuevosOwners = [config.owner[0]]
    Object.keys(req.body).forEach(key => {
      if (key.startsWith('owner_')) {
        const valor = (req.body[key] || '').trim().replace(/\D/g, '')
        if (valor && !nuevosOwners.includes(valor)) nuevosOwners.push(valor)
      }
    })

    const nuevoStaff = []
    Object.keys(req.body).forEach(key => {
      if (key.startsWith('staff_n_')) {
        const idx = key.slice('staff_n_'.length)
        const nombre = req.body[key]
        const numero = req.body[`staff_u_${idx}`]
        if (nombre && nombre.trim() && numero && numero.trim()) {
          nuevoStaff.push({ nombre: nombre.trim(), numero: numero.trim().replace(/\D/g, '') })
        }
      }
    })

    guardarConfig({
      ...config,
      prefijo,
      idiomaPorDefecto: idiomaPorDefecto || config.idiomaPorDefecto,
      prioridad: parseInt(prioridad, 10) || 0,
      owner: nuevosOwners,
      staff: nuevoStaff,
      bienvenida: {
        activa: bienvenidaActiva === 'true',
        mensajeEntrada: mensajeEntrada || config.bienvenida?.mensajeEntrada || '',
        mensajeSalida: mensajeSalida || config.bienvenida?.mensajeSalida || '',
      },
      maxSubbots: parseInt(maxSubbots, 10) || 0,
      subbotsPorUsuario: parseInt(subbotsPorUsuario, 10) || 0,
    })
    res.redirect(`/?token=${encodeURIComponent(token)}&tab=config`)
  })

  app.post('/action/toggle', (req, res) => {
    const { token, nombre, activo } = req.body
    if (!tokensCoinciden(token, obtenerToken())) return res.status(401).send('Error')
    const desactivados = new Set(config.comandosDesactivados || [])
    if (activo === 'true') desactivados.delete(nombre)
    else desactivados.add(nombre)
    const comandosDesactivados = [...desactivados]
    guardarConfig({ ...config, comandosDesactivados })
    res.redirect(`/?token=${encodeURIComponent(token)}&tab=cmds`)
  })

  app.post('/action/ban', async (req, res) => {
    const { token, jid, banned } = req.body
    if (!tokensCoinciden(token, obtenerToken())) return res.status(401).send('Error')
    const db = await getDB()
    if (db.data.users[jid]) {
      db.data.users[jid].banned = (banned === 'true')
      await db.write()
    }
    res.redirect(`/?token=${encodeURIComponent(token)}&tab=users`)
  })

  app.post('/action/bc', async (req, res) => {
    const { token, mensaje } = req.body
    if (!tokensCoinciden(token, obtenerToken())) return res.status(401).send('Error')
    if (sockActivo && mensaje && mensaje.trim()) {
      const db = await getDB()
      const chats = Object.keys(db.data.chats || {})
      for (const c of chats) {
        try { await sockActivo.sendMessage(c, { text: mensaje }) } catch {}
      }
    }
    res.redirect(`/?token=${encodeURIComponent(token)}&tab=bc`)
  })

  app.post('/action/term', (req, res) => {
    const { token, cmd } = req.body
    if (!tokensCoinciden(token, obtenerToken())) return res.status(401).send('Error')
    if (!COMANDOS_TERMINAL_SEGUROS.has(cmd)) return res.redirect(`/?token=${encodeURIComponent(token)}&tab=term`)
    exec(cmd, (err, stdout, stderr) => {
      res.send(renderPagina(token, 'term', { output: stdout || stderr || 'OK' }))
    })
  })

  app.post('/action/stop', async (req, res) => {
    const { token, jid } = req.body
    if (!tokensCoinciden(token, obtenerToken())) return res.status(401).send('Error')
    if (detenerSubbot) await detenerSubbot(jid)
    res.redirect(`/?token=${encodeURIComponent(token)}&tab=subs`)
  })

  app.post('/action/restart', (req, res) => {
    const { token } = req.body
    if (!tokensCoinciden(token, obtenerToken())) return res.status(401).send('Error')
    res.send('<h1>Reiniciando...</h1><script>setTimeout(()=>location.href="/", 2000)</script>')
    setTimeout(() => process.exit(0), 1000)
  })

  app.get('/api/status', verificarToken, async (req, res) => {
    try {
      const db = await getDB()
      res.json({
        uptime: process.uptime().toFixed(0) + 's',
        ram: (process.memoryUsage().rss / 1024 / 1024).toFixed(1) + ' MB',
        usuarios: Object.keys(db.data.users || {}).length,
        subbots: listarSubbots ? listarSubbots().filter(s => s.conectado).length : 0
      })
    } catch (e) { res.status(500).json({ error: 'Error' }) }
  })

  app.get('/api/logs', verificarToken, (req, res) => {
    res.json(logsBuffer.map(l => ({ time: l.time, msg: esc(l.msg) })))
  })

  let intentos = 0
  const maxIntentos = 5

  function startServer(port) {
    const server = app.listen(port, '0.0.0.0', () => {
      const token = obtenerToken()
      console.log('\n' + '═'.repeat(50))
      console.log('🌐 PANEL: http://localhost:' + port)
      console.log('🔑 TOKEN ÚNICO: ' + token)
      console.log('═'.repeat(50) + '\n')
    })

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        intentos++
        if (intentos < maxIntentos) {
          console.log(`⚠️ Puerto ${port} ocupado. Reintentando (${intentos}/${maxIntentos})...`)
          setTimeout(() => startServer(port), 3000)
        } else {
          console.log(`❌ Puerto ${port} bloqueado. Intentando puerto alternativo...`)
          startServer(port + 1)
        }
      }
    })
  }

  startServer(config.panelPort)
}

function paginaLogin(mensajeError = '') {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TheYui-MD · Login</title>
        <style>
            body { background: radial-gradient(circle at top, #10101c 0%, #060609 60%); color: #eee; font-family: 'Segoe UI', system-ui, sans-serif; text-align: center; padding-top: 110px; margin: 0; }
            .box { max-width: 300px; margin: 0 auto; padding: 32px 28px; background: #0d0d16; border: 1px solid #ff2d95; border-radius: 16px; box-shadow: 0 0 30px rgba(255,45,149,.15); }
            .box h1 { color: #ff2d95; margin: 0 0 4px 0; font-size: 22px; }
            .box span { font-size: 28px; }
            .box p { color: #555; font-size: 10px; letter-spacing: 1px; margin-top: 0; }
            input { width: 100%; padding: 13px; margin: 20px 0 14px 0; background: #000; color: #fff; border: 1px solid #222; border-radius: 10px; box-sizing: border-box; font-size: 13px; }
            input:focus { outline: none; border-color: #00d4ff; }
            button { width: 100%; padding: 13px; background: linear-gradient(135deg, #ff2d95, #ff5fb3); color: #fff; border: none; font-weight: 700; border-radius: 10px; cursor: pointer; text-transform: uppercase; font-size: 12px; }
            .error { color: #ff4d6d; font-size: 12px; margin-top: -6px; margin-bottom: 10px; }
        </style>
    </head>
    <body>
        <div class="box">
            <span>🦋</span>
            <h1>THEYUI-MD</h1>
            <p>PANEL DE CONTROL</p>
            <form action="/login" method="POST">
                <input type="password" name="token" placeholder="Token de acceso" required>
                ${mensajeError ? `<div class="error">${esc(mensajeError)}</div>` : ''}
                <button type="submit">Entrar</button>
            </form>
        </div>
    </body>
    </html>
  `
}
