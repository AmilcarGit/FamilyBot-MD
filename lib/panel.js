import express from 'express'
import fs from 'fs'
import path from 'path'
import { getDB } from './db.js'
import { listarSubbots, detenerSubbot } from '../subbots/manager.js'
import { obtenerComandosPanel } from '../handler.js'
import config from '../config.js'
import { randomBytes } from 'crypto'
import { exec } from 'child_process'

let sockActivo = null
let tokenUnico = null
const logsBuffer = []
const MAX_LOGS = 100
const COMANDOS_TERMINAL_SEGUROS = new Set(['node -v', 'npm -v', 'npm list --depth=0', 'uptime', 'free -h', 'df -h'])

const originalLog = console.log
console.log = (...args) => {
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')
  logsBuffer.push({ time: new Date().toLocaleTimeString(), msg })
  if (logsBuffer.length > MAX_LOGS) logsBuffer.shift()
  originalLog.apply(console, args)
}

export function establecerSockActivo(sock) {
  sockActivo = sock
}

function obtenerToken() {
  if (tokenUnico) return tokenUnico
  const rutaToken = path.join(process.cwd(), '.panel_token')
  if (fs.existsSync(rutaToken)) {
    tokenUnico = fs.readFileSync(rutaToken, 'utf-8').trim()
  } else {
    tokenUnico = 'yui-' + randomBytes(4).toString('hex')
    fs.writeFileSync(rutaToken, tokenUnico)
  }
  return tokenUnico
}

function guardarConfig(nuevoConfig) {
  const rutaConfig = path.join(process.cwd(), 'config.js')
  const contenido = `export default ${JSON.stringify(nuevoConfig, null, 2)}\n`
  fs.writeFileSync(rutaConfig, contenido)
  Object.assign(config, nuevoConfig)
}

function renderPagina(token, tab = 'dash', extra = {}) {
  const t = token
  const menu = `
    <div class="nav">
        <a href="/?token=${t}&tab=dash" class="${tab === 'dash' ? 'active' : ''}">Inicio</a>
        <a href="/?token=${t}&tab=users" class="${tab === 'users' ? 'active' : ''}">Usuarios</a>
        <a href="/?token=${t}&tab=config" class="${tab === 'config' ? 'active' : ''}">Config</a>
        <a href="/?token=${t}&tab=cmds" class="${tab === 'cmds' ? 'active' : ''}">Comandos</a>
        <a href="/?token=${t}&tab=subs" class="${tab === 'subs' ? 'active' : ''}">SubBots</a>
        <a href="/?token=${t}&tab=bc" class="${tab === 'bc' ? 'active' : ''}">Anuncio</a>
        <a href="/?token=${t}&tab=term" class="${tab === 'term' ? 'active' : ''}">Terminal</a>
    </div>
  `

  let content = ''
  if (tab === 'dash') {
    content = `
      <div class="grid">
          <div class="stat"><small>UPTIME</small><br><b>${process.uptime().toFixed(0)}s</b></div>
          <div class="stat" style="border-color:#00d4ff"><small>RAM</small><br><b>${(process.memoryUsage().rss / 1024 / 1024).toFixed(1)}MB</b></div>
      </div>
      <div class="card">
          <h3 style="color:#ff007f; font-size:12px; margin:0 0 10px 0;">CONSOLA</h3>
          <div class="term">${logsBuffer.map(l => `<div>[${l.time}] ${l.msg}</div>`).join('')}</div>
      </div>
    `
  } else if (tab === 'users') {
    const users = extra.users || {}
    content = `
      <div class="card">
          <h3>Usuarios</h3>
          <table>
              <tr><th>ID</th><th>Acción</th></tr>
              ${Object.keys(users).map(k => `
                <tr>
                    <td>${k.split('@')[0]}</td>
                    <td>
                        <form action="/action/ban" method="POST" style="margin:0">
                            <input type="hidden" name="token" value="${t}">
                            <input type="hidden" name="jid" value="${k}">
                            <input type="hidden" name="banned" value="${!users[k].banned}">
                            <button type="submit" class="btn-s" style="background:${users[k].banned ? '#0f0' : '#f00'}">${users[k].banned ? 'UNBAN' : 'BAN'}</button>
                        </form>
                    </td>
                </tr>
              `).join('')}
          </table>
      </div>
    `
  } else if (tab === 'config') {
    content = `
      <div class="card" style="max-width:400px; margin:0 auto;">
          <h3>Configuración</h3>
          <form action="/action/config" method="POST">
              <input type="hidden" name="token" value="${t}">
              <label>Nombre Bot</label><input name="nombreBot" value="${config.nombreBot}">
              <label>Prefijo</label><input name="prefijo" value="${config.prefijo}">
              <label>Owner</label><input name="owner" value="${config.owner[0]}">
              <button type="submit" class="btn">Guardar</button>
          </form>
      </div>
    `
  } else if (tab === 'cmds') {
    const cmds = obtenerComandosPanel()
    content = `
      <div class="card">
          <h3>Comandos</h3>
          <table>
              <tr><th>Nombre</th><th>Estado</th></tr>
              ${cmds.map(c => `
                <tr>
                    <td>${c.nombre}</td>
                    <td>
                        <form action="/action/toggle" method="POST" style="margin:0">
                            <input type="hidden" name="token" value="${t}">
                            <input type="hidden" name="nombre" value="${c.nombre}">
                            <input type="hidden" name="activo" value="${!c.activo}">
                            <button type="submit" class="btn-s" style="background:${c.activo ? '#0f0' : '#f00'}">${c.activo ? 'ON' : 'OFF'}</button>
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
          <h3>Sub-Bots</h3>
          <div class="grid">
              ${subs.map(s => `
                <div class="stat">
                    <small>${s.jid || 'SUB'}</small><br>
                    <form action="/action/stop" method="POST" style="margin-top:5px">
                        <input type="hidden" name="token" value="${t}">
                        <input type="hidden" name="jid" value="${s.jid}">
                        <button type="submit" class="btn-s" style="background:red">STOP</button>
                    </form>
                </div>
              `).join('')}
          </div>
      </div>
    `
  } else if (tab === 'bc') {
    content = `
      <div class="card" style="max-width:400px; margin:0 auto;">
          <h3>Anuncio Global</h3>
          <form action="/action/bc" method="POST">
              <input type="hidden" name="token" value="${t}">
              <textarea name="mensaje" placeholder="Escribe aquí..."></textarea>
              <button type="submit" class="btn">Enviar a Todos</button>
          </form>
      </div>
    `
  } else if (tab === 'term') {
    content = `
      <div class="card">
          <h3>Terminal</h3>
          <form action="/action/term" method="POST">
              <input type="hidden" name="token" value="${t}">
              <select name="cmd"><option value="uptime">Uptime</option><option value="free -h">RAM</option></select>
              <button type="submit" class="btn">Ejecutar</button>
          </form>
          ${extra.output ? `<pre class="term" style="height:100px; color:#00d4ff; margin-top:10px;">${extra.output}</pre>` : ''}
      </div>
    `
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>YUI V9 PRO</title>
    <style>
        body { background: #050508; color: #eee; font-family: sans-serif; margin: 0; padding: 15px; }
        .neon-pink { color: #ff007f; text-shadow: 0 0 10px #ff007f; }
        .neon-blue { color: #00d4ff; text-shadow: 0 0 10px #00d4ff; }
        .nav { display: flex; gap: 8px; overflow-x: auto; margin-bottom: 20px; padding-bottom: 5px; }
        .nav a { padding: 10px 15px; background: #111; color: #888; text-decoration: none; border-radius: 8px; font-size: 12px; border: 1px solid #333; white-space: nowrap; }
        .nav a.active { background: #00d4ff; color: #000; font-weight: bold; border-color: #00d4ff; }
        .card { background: #0c0c16; padding: 15px; border-radius: 12px; border: 1px solid #222; margin-bottom: 15px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .stat { background: #111; padding: 12px; border-radius: 8px; border-left: 3px solid #ff007f; }
        .stat small { font-size: 9px; color: #555; }
        .term { background: #000; color: #0f0; padding: 10px; font-family: monospace; height: 200px; overflow: auto; font-size: 11px; border: 1px solid #222; }
        input, select, textarea { width: 100%; padding: 12px; margin-bottom: 10px; background: #000; color: #fff; border: 1px solid #333; border-radius: 8px; }
        label { font-size: 10px; color: #666; display: block; margin-bottom: 2px; }
        .btn { width: 100%; padding: 12px; background: #ff007f; color: #fff; border: none; font-weight: bold; border-radius: 8px; cursor: pointer; text-transform: uppercase; }
        .btn-s { padding: 5px 10px; border-radius: 5px; border: none; cursor: pointer; font-size: 10px; font-weight: bold; color: #fff; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { text-align: left; color: #444; padding: 8px; border-bottom: 1px solid #222; }
        td { padding: 8px; border-bottom: 1px solid #111; }
    </style>
</head>
<body>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h2 class="neon-blue" style="margin:0">YUI CORE V9</h2>
        <form action="/action/restart" method="POST" style="margin:0">
            <input type="hidden" name="token" value="${t}">
            <button type="submit" class="btn-s" style="background:red">REINICIAR</button>
        </form>
    </div>
    ${menu}
    ${content}
</body>
</html>`
}

export function iniciarPanel() {
  if (!config.panelActivo) return
  const app = express()
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  
  app.get('/', (req, res) => {
    const token = req.query.token
    const tab = req.query.tab || 'dash'
    const realToken = obtenerToken()
    
    if (!token || token !== realToken) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>YUI LOGIN</title>
            <style>
                body { background: #050508; color: #eee; font-family: sans-serif; text-align: center; padding-top: 100px; }
                .box { max-width: 300px; margin: 0 auto; padding: 30px; background: #0c0c16; border: 2px solid #ff007f; border-radius: 15px; }
                input { width: 100%; padding: 12px; margin-bottom: 15px; background: #000; color: #fff; border: 1px solid #333; border-radius: 8px; box-sizing: border-box; }
                button { width: 100%; padding: 12px; background: #ff007f; color: #fff; border: none; font-weight: bold; border-radius: 8px; cursor: pointer; }
            </style>
        </head>
        <body>
            <div class="box">
                <h1 style="color:#ff007f">THE YUI</h1>
                <p style="color:#555; font-size:10px;">SISTEMA MULTI-PÁGINA V9</p>
                <form action="/login" method="POST">
                    <input type="password" name="token" placeholder="TOKEN" required>
                    <button type="submit">ENTRAR</button>
                </form>
            </div>
        </body>
        </html>
      `)
    }

    if (tab === 'users') {
      getDB().then(db => res.send(renderPagina(token, 'users', { users: db.data.users })))
    } else {
      res.send(renderPagina(token, tab))
    }
  })

  app.post('/login', (req, res) => {
    const token = req.body.token
    if (token === obtenerToken()) {
      res.redirect(`/?token=${token}`)
    } else {
      res.status(401).send('<h1>TOKEN INCORRECTO</h1><a href="/">Volver</a>')
    }
  })

  app.post('/action/config', (req, res) => {
    const { token, nombreBot, prefijo, owner } = req.body
    if (token !== obtenerToken()) return res.status(401).send('Error')
    guardarConfig({ ...config, nombreBot, prefijo, owner: [owner] })
    res.redirect(`/?token=${token}&tab=config`)
  })

  app.post('/action/toggle', (req, res) => {
    const { token, nombre, activo } = req.body
    if (token !== obtenerToken()) return res.status(401).send('Error')
    const desactivados = new Set(config.comandosDesactivados || [])
    if (activo === 'true') desactivados.delete(nombre)
    else desactivados.add(nombre)
    guardarConfig({ ...config, comandosDesactivados: [...desactivados] })
    res.redirect(`/?token=${token}&tab=cmds`)
  })

  app.post('/action/ban', async (req, res) => {
    const { token, jid, banned } = req.body
    if (token !== obtenerToken()) return res.status(401).send('Error')
    const db = await getDB()
    if (db.data.users[jid]) {
      db.data.users[jid].banned = (banned === 'true')
      await db.write()
    }
    res.redirect(`/?token=${token}&tab=users`)
  })

  app.post('/action/bc', async (req, res) => {
    const { token, mensaje } = req.body
    if (token !== obtenerToken()) return res.status(401).send('Error')
    if (sockActivo) {
      const db = await getDB()
      const chats = Object.keys(db.data.chats || {})
      for (const c of chats) await sockActivo.sendMessage(c, { text: mensaje })
    }
    res.redirect(`/?token=${token}&tab=bc`)
  })

  app.post('/action/term', (req, res) => {
    const { token, cmd } = req.body
    if (token !== obtenerToken()) return res.status(401).send('Error')
    if (!COMANDOS_TERMINAL_SEGUROS.has(cmd)) return res.redirect(`/?token=${token}&tab=term`)
    exec(cmd, (err, stdout, stderr) => {
      res.send(renderPagina(token, 'term', { output: stdout || stderr || 'OK' }))
    })
  })

  app.post('/action/stop', async (req, res) => {
    const { token, jid } = req.body
    if (token !== obtenerToken()) return res.status(401).send('Error')
    if (detenerSubbot) await detenerSubbot(jid)
    res.redirect(`/?token=${token}&tab=subs`)
  })

  app.post('/action/restart', (req, res) => {
    const { token } = req.body
    if (token !== obtenerToken()) return res.status(401).send('Error')
    res.send('<h1>Reiniciando...</h1><script>setTimeout(()=>location.href="/", 2000)</script>')
    setTimeout(() => process.exit(0), 1000)
  })

  app.get('/api/status', verificarToken, async (req, res) => {
    const db = await getDB()
    res.json({
      uptime: process.uptime().toFixed(0) + 's',
      ram: (process.memoryUsage().rss / 1024 / 1024).toFixed(1) + ' MB',
      usuarios: Object.keys(db.data.users || {}).length,
      subbots: listarSubbots ? listarSubbots().filter(s => s.conectado).length : 0
    })
  })

  app.get('/api/logs', verificarToken, (req, res) => res.json(logsBuffer))

  app.listen(config.panelPort, '0.0.0.0', () => {
    const token = obtenerToken()
    console.log('\n' + '═'.repeat(50))
    console.log('🌐 PANEL MULTI-PÁGINA V9: http://localhost:' + config.panelPort)
    console.log('🔑 TOKEN ÚNICO: ' + token)
    console.log('═'.repeat(50) + '\n')
  })
}
