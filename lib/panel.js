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

function verificarToken(req, res, next) {
  const token = req.query.token || req.headers['x-panel-token']
  if (token !== obtenerToken()) return res.status(401).json({ error: 'Token inválido' })
  next()
}

function guardarConfig(nuevoConfig) {
  const rutaConfig = path.join(process.cwd(), 'config.js')
  const contenido = `export default ${JSON.stringify(nuevoConfig, null, 2)}\n`
  fs.writeFileSync(rutaConfig, contenido)
  Object.assign(config, nuevoConfig)
}

function paginaHtml() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.nombreBot} | Ultra Core Command Center</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"/>
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        :root {
            --neon-pink: #ff007f;
            --neon-blue: #00d4ff;
            --neon-purple: #b000ff;
            --bg-dark: #030305;
            --card-bg: rgba(12, 12, 22, 0.85);
        }
        body {
            background-color: var(--bg-dark);
            color: #e0e0e6;
            font-family: 'Rajdhani', sans-serif;
            background-image: 
                radial-gradient(circle at 10% 20%, rgba(255, 0, 127, 0.08) 0%, transparent 40%),
                radial-gradient(circle at 90% 80%, rgba(0, 212, 255, 0.08) 0%, transparent 40%);
            overflow-x: hidden;
        }
        .orbitron { font-family: 'Orbitron', sans-serif; }
        .glass {
            background: var(--card-bg);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.9);
        }
        .neon-border-pink { border-left: 4px solid var(--neon-pink); }
        .neon-border-blue { border-left: 4px solid var(--neon-blue); }
        .neon-text-pink { color: var(--neon-pink); text-shadow: 0 0 12px var(--neon-pink); }
        .neon-text-blue { color: var(--neon-blue); text-shadow: 0 0 12px var(--neon-blue); }
        .btn-cyber {
            background: linear-gradient(45deg, var(--neon-pink), var(--neon-purple));
            clip-path: polygon(8% 0, 100% 0, 92% 100%, 0 100%);
            transition: 0.3s;
        }
        .btn-cyber:hover {
            transform: scale(1.03);
            box-shadow: 0 0 25px var(--neon-pink);
        }
        .terminal {
            background: #000;
            font-family: 'Courier New', monospace;
            height: 350px;
            overflow-y: auto;
            border: 1px solid #1f1f2e;
        }
        .terminal::-webkit-scrollbar { width: 6px; }
        .terminal::-webkit-scrollbar-thumb { background: var(--neon-pink); }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.4; }
            100% { opacity: 1; }
        }
        .tab-btn.active {
            background: linear-gradient(90deg, rgba(255,0,127,0.2), rgba(0,212,255,0.2));
            border-color: var(--neon-blue);
            color: #fff;
            box-shadow: 0 0 15px rgba(0,212,255,0.3);
        }
    </style>
</head>
<body class="p-4 md:p-8">
    
    <div id="login" class="max-w-md mx-auto mt-32 animate__animated animate__fadeIn">
        <div class="glass p-8 rounded-2xl text-center border-t-4 border-pink-600">
            <h1 class="orbitron text-3xl font-black neon-text-pink mb-2">${config.nombreBot}</h1>
            <p class="text-gray-400 tracking-widest text-sm mb-8 uppercase">Neural Security Gate</p>
            <div class="relative mb-6">
                <i data-lucide="shield-alert" class="absolute left-3 top-3.5 text-gray-500 w-5 h-5"></i>
                <input id="token" type="password" placeholder="TOKEN DE ACCESO" class="w-full bg-black border border-gray-800 rounded-lg py-3 px-10 text-white focus:border-pink-500 outline-none transition-all">
            </div>
            <button onclick="entrar()" class="btn-cyber w-full py-3 text-white font-bold tracking-widest uppercase">AUTENTICAR SISTEMA</button>
        </div>
    </div>

    <div id="panel" class="hidden animate__animated animate__fadeIn max-w-7xl mx-auto">
        <header class="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 glass p-6 rounded-2xl">
            <div>
                <h1 class="orbitron text-3xl md:text-4xl font-black neon-text-blue">${config.nombreBot} <span class="text-xs text-pink-500 px-2 py-1 rounded bg-pink-500/10">ULTRA PRO</span></h1>
                <p class="text-gray-400 flex items-center gap-2 text-sm mt-1"><i data-lucide="cpu" class="w-4 h-4 text-blue-500"></i> CENTRO DE CONTROL Y MONITOREO NEURAL</p>
            </div>
            <div class="flex flex-wrap gap-3">
                <div class="glass px-5 py-2 rounded-xl flex items-center gap-3">
                    <span class="w-3 h-3 bg-green-500 rounded-full pulse shadow-[0_0_12px_#22c55e]"></span>
                    <span class="font-bold text-sm tracking-wider">ONLINE</span>
                </div>
                <button onclick="reiniciarBot()" class="glass px-5 py-2 rounded-xl hover:bg-red-900/30 text-red-400 transition-all flex items-center gap-2 font-bold text-sm">
                    <i data-lucide="power" class="w-4 h-4"></i> REINICIAR
                </button>
            </div>
        </header>

        <nav class="flex flex-wrap gap-2 mb-8">
            <button onclick="cambiarTab('dashboard')" id="btn-dashboard" class="tab-btn active glass px-6 py-3 rounded-xl font-bold tracking-wider uppercase text-sm flex items-center gap-2 border border-white/10 transition-all">
                <i data-lucide="layout-dashboard" class="w-4 h-4"></i> Dashboard
            </button>
            <button onclick="cambiarTab('usuarios')" id="btn-usuarios" class="tab-btn glass px-6 py-3 rounded-xl font-bold tracking-wider uppercase text-sm flex items-center gap-2 border border-white/10 transition-all">
                <i data-lucide="users" class="w-4 h-4"></i> Usuarios
            </button>
            <button onclick="cambiarTab('config')" id="btn-config" class="tab-btn glass px-6 py-3 rounded-xl font-bold tracking-wider uppercase text-sm flex items-center gap-2 border border-white/10 transition-all">
                <i data-lucide="sliders" class="w-4 h-4"></i> Configuración
            </button>
            <button onclick="cambiarTab('subbots')" id="btn-subbots" class="tab-btn glass px-6 py-3 rounded-xl font-bold tracking-wider uppercase text-sm flex items-center gap-2 border border-white/10 transition-all">
                <i data-lucide="cpu" class="w-4 h-4"></i> Sub-Bots
            </button>
            <button onclick="cambiarTab('comandos')" id="btn-comandos" class="tab-btn glass px-6 py-3 rounded-xl font-bold tracking-wider uppercase text-sm flex items-center gap-2 border border-white/10 transition-all">
                <i data-lucide="toggle-right" class="w-4 h-4"></i> Comandos
            </button>
            <button onclick="cambiarTab('broadcast')" id="btn-broadcast" class="tab-btn glass px-6 py-3 rounded-xl font-bold tracking-wider uppercase text-sm flex items-center gap-2 border border-white/10 transition-all">
                <i data-lucide="megaphone" class="w-4 h-4"></i> Broadcast
            </button>
            <button onclick="cambiarTab('terminal')" id="btn-terminal" class="tab-btn glass px-6 py-3 rounded-xl font-bold tracking-wider uppercase text-sm flex items-center gap-2 border border-white/10 transition-all">
                <i data-lucide="terminal" class="w-4 h-4"></i> Terminal
            </button>
        </nav>

        <div id="tab-dashboard" class="tab-content space-y-8">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div class="glass p-6 rounded-2xl neon-border-pink">
                    <p class="text-gray-400 text-xs font-bold uppercase mb-2">Tiempo Activo</p>
                    <h2 id="uptime" class="orbitron text-2xl font-bold">-</h2>
                </div>
                <div class="glass p-6 rounded-2xl neon-border-blue">
                    <p class="text-gray-400 text-xs font-bold uppercase mb-2">Memoria RAM</p>
                    <h2 id="ram" class="orbitron text-2xl font-bold">-</h2>
                </div>
                <div class="glass p-6 rounded-2xl neon-border-pink">
                    <p class="text-gray-400 text-xs font-bold uppercase mb-2">Usuarios Totales</p>
                    <h2 id="usuarios-count" class="orbitron text-2xl font-bold">-</h2>
                </div>
                <div class="glass p-6 rounded-2xl neon-border-blue">
                    <p class="text-gray-400 text-xs font-bold uppercase mb-2">Sub-Bots Activos</p>
                    <h2 id="subbots-count" class="orbitron text-2xl font-bold">-</h2>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div class="glass p-6 rounded-2xl">
                    <div class="flex justify-between items-center mb-5">
                        <h3 class="orbitron text-lg flex items-center gap-2"><i data-lucide="trending-up" class="text-pink-500"></i> COMANDOS MÁS USADOS</h3>
                        <span id="comandos-total" class="text-xs text-gray-400">0 ejecuciones</span>
                    </div>
                    <div id="top-comandos" class="space-y-3"><p class="text-gray-500 text-sm">Esperando datos...</p></div>
                </div>
                <div class="glass p-6 rounded-2xl">
                    <div class="flex justify-between items-center mb-5">
                        <h3 class="orbitron text-lg flex items-center gap-2"><i data-lucide="clock-3" class="text-blue-500"></i> ACTIVIDAD POR HORA</h3>
                        <span class="text-xs text-gray-400">Último ciclo</span>
                    </div>
                    <div id="actividad-horas" class="grid grid-cols-12 gap-1 items-end h-24"></div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div class="lg:col-span-2 space-y-8">
                    <div class="glass p-6 rounded-2xl">
                        <div class="flex justify-between items-center mb-6">
                            <h3 class="orbitron text-lg flex items-center gap-2"><i data-lucide="terminal" class="text-pink-500"></i> CONSOLA EN VIVO</h3>
                            <span class="text-[10px] bg-pink-500/20 text-pink-500 px-2 py-1 rounded">STREAMING</span>
                        </div>
                        <div id="logs" class="terminal p-4 rounded-lg text-xs space-y-1">
                            <div class="text-gray-500">[SISTEMA] Conectando al núcleo...</div>
                        </div>
                    </div>
                </div>
                <div class="space-y-8">
                    <div class="glass p-6 rounded-2xl">
                        <h3 class="orbitron text-lg mb-6 flex items-center gap-2"><i data-lucide="bar-chart-3" class="text-blue-500"></i> RENDIMIENTO RAM</h3>
                        <canvas id="ramChart" height="180"></canvas>
                    </div>
                </div>
            </div>
        </div>

        <div id="tab-usuarios" class="tab-content hidden space-y-6">
            <div class="glass p-6 rounded-2xl">
                <h3 class="orbitron text-xl font-bold mb-6 flex items-center gap-2"><i data-lucide="users" class="text-pink-500"></i> GESTIÓN DE USUARIOS</h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="border-b border-white/10 text-gray-400 text-xs uppercase">
                                <th class="p-3">JID / Usuario</th>
                                <th class="p-3">Diamantes</th>
                                <th class="p-3">Experiencia</th>
                                <th class="p-3">Estado</th>
                                <th class="p-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="tabla-usuarios-body" class="text-sm">
                            <tr><td colspan="5" class="p-4 text-center text-gray-500">Cargando usuarios...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div id="tab-config" class="tab-content hidden space-y-6">
            <div class="glass p-6 rounded-2xl max-w-2xl mx-auto">
                <h3 class="orbitron text-xl font-bold mb-6 flex items-center gap-2"><i data-lucide="sliders" class="text-blue-500"></i> CONFIGURACIÓN REMOTA</h3>
                <form id="form-config" onsubmit="guardarConfiguracion(event)" class="space-y-4">
                    <div>
                        <label class="block text-xs uppercase font-bold text-gray-400 mb-2">Nombre del Bot</label>
                        <input id="cfg-nombre" type="text" class="w-full bg-black border border-gray-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-xs uppercase font-bold text-gray-400 mb-2">Prefijo</label>
                        <input id="cfg-prefijo" type="text" class="w-full bg-black border border-gray-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-xs uppercase font-bold text-gray-400 mb-2">Número del Owner</label>
                        <input id="cfg-owner" type="text" class="w-full bg-black border border-gray-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-xs uppercase font-bold text-gray-400 mb-2">Staff</label>
                        <input id="cfg-staff" type="text" placeholder="Nombre|Número, Otro|Número" class="w-full bg-black border border-gray-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none">
                        <p class="text-xs text-gray-500 mt-2">Formato: Nombre|Número, separado por comas.</p>
                    </div>
                    <button type="submit" class="btn-cyber w-full py-3 text-white font-bold tracking-widest uppercase">GUARDAR CAMBIOS</button>
                </form>
            </div>
        </div>

        <div id="tab-subbots" class="tab-content hidden space-y-6">
            <div class="glass p-6 rounded-2xl">
                <h3 class="orbitron text-xl font-bold mb-6 flex items-center gap-2"><i data-lucide="cpu" class="text-pink-500"></i> CONTROL DE SUB-BOTS</h3>
                <div id="lista-subbots" class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <p class="text-gray-500">Cargando sub-bots...</p>
                </div>
            </div>
        </div>

        <div id="tab-comandos" class="tab-content hidden space-y-6">
            <div class="glass p-6 rounded-2xl">
                <div class="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                    <div>
                        <h3 class="orbitron text-xl font-bold flex items-center gap-2"><i data-lucide="toggle-right" class="text-blue-500"></i> GESTOR DE COMANDOS</h3>
                        <p class="text-gray-400 text-sm mt-2">Activa o desactiva comandos sin editar archivos del bot.</p>
                    </div>
                    <input id="filtro-comandos" oninput="filtrarComandos()" type="search" placeholder="Buscar comando..." class="bg-black border border-gray-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none">
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="border-b border-white/10 text-gray-400 text-xs uppercase">
                                <th class="p-3">Comando</th>
                                <th class="p-3">Categoría</th>
                                <th class="p-3">Descripción</th>
                                <th class="p-3">Uso</th>
                                <th class="p-3">Estado</th>
                            </tr>
                        </thead>
                        <tbody id="tabla-comandos-body" class="text-sm"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <div id="tab-broadcast" class="tab-content hidden space-y-6">
            <div class="glass p-6 rounded-2xl max-w-2xl mx-auto">
                <h3 class="orbitron text-xl font-bold mb-6 flex items-center gap-2"><i data-lucide="megaphone" class="text-blue-500"></i> ENVÍO DE BROADCAST (ANUNCIO)</h3>
                <div class="space-y-4">
                    <div>
                        <label class="block text-xs uppercase font-bold text-gray-400 mb-2">Mensaje Global</label>
                        <textarea id="bc-mensaje" rows="5" placeholder="Escribe tu anuncio aquí..." class="w-full bg-black border border-gray-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none"></textarea>
                    </div>
                    <button onclick="enviarBroadcast()" class="btn-cyber w-full py-3 text-white font-bold tracking-widest uppercase">ENVIAR ANUNCIO</button>
                </div>
            </div>
        </div>

        <div id="tab-terminal" class="tab-content hidden space-y-6">
            <div class="glass p-6 rounded-2xl">
                <h3 class="orbitron text-xl font-bold mb-6 flex items-center gap-2"><i data-lucide="terminal" class="text-pink-500"></i> TERMINAL SEGURA</h3>
                <div class="space-y-4">
                    <div class="flex gap-2">
                        <input id="term-cmd" type="text" placeholder="node -v | npm -v | npm list --depth=0 | uptime | free -h | df -h" class="w-full bg-black border border-gray-800 rounded-lg p-3 text-white focus:border-pink-500 outline-none font-mono text-sm">
                        <button onclick="ejecutarComando()" class="btn-cyber px-8 py-3 text-white font-bold uppercase text-sm">EJECUTAR</button>
                    </div>
                    <div id="term-output" class="terminal p-4 rounded-lg text-xs text-green-400 font-mono">Esperando comandos...</div>
                </div>
            </div>
        </div>

        <footer class="mt-12 text-center text-gray-600 text-xs tracking-widest">
            THE YUI-MD ULTRA PANEL &copy; 2026 | SECURED NEURAL CORE
        </footer>
    </div>

    <script>
        lucide.createIcons();
        let currentToken = localStorage.getItem('yui_token') || '';
        let ramHistory = [];
        let labels = [];
        let chart;

        function initChart() {
            const ctx = document.getElementById('ramChart').getContext('2d');
            chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'RAM (MB)',
                        data: ramHistory,
                        borderColor: '#00d4ff',
                        backgroundColor: 'rgba(0, 212, 255, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: { beginAtZero: false, grid: { color: 'rgba(255,255,255,0.05)' } },
                        x: { display: false }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }

        function cambiarTab(tab) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
            document.getElementById('tab-' + tab).classList.remove('hidden');
            document.getElementById('btn-' + tab).classList.add('active');
            
            if(tab === 'usuarios') cargarUsuarios();
            if(tab === 'config') cargarConfig();
            if(tab === 'subbots') cargarSubbots();
            if(tab === 'comandos') cargarComandos();
        }

        async function entrar() {
            const val = document.getElementById('token').value || currentToken;
            try {
                const res = await fetch('/api/status', { headers: { 'x-panel-token': val } });
                if (res.ok) {
                    localStorage.setItem('yui_token', val);
                    currentToken = val;
                    document.getElementById('login').classList.add('hidden');
                    document.getElementById('panel').classList.remove('hidden');
                    initChart();
                    setInterval(actualizar, 3000);
                    actualizar();
                } else {
                    alert('TOKEN INVÁLIDO');
                    localStorage.removeItem('yui_token');
                }
            } catch(e) { alert('ERROR DE CONEXIÓN'); }
        }

        async function actualizar() {
            try {
                const res = await fetch('/api/status', { headers: { 'x-panel-token': currentToken } });
                const d = await res.json();
                
                document.getElementById('uptime').innerText = d.uptime;
                document.getElementById('ram').innerText = d.ram;
                document.getElementById('usuarios-count').innerText = d.usuarios;
                document.getElementById('subbots-count').innerText = d.subbots;

                const ramVal = parseFloat(d.ram);
                ramHistory.push(ramVal);
                labels.push(new Date().toLocaleTimeString());
                if(ramHistory.length > 20) { ramHistory.shift(); labels.shift(); }
                if(chart) chart.update();

                const stats = d.stats || {};
                document.getElementById('comandos-total').innerText = (stats.comandosEjecutados || 0) + ' ejecuciones';
                const top = Object.entries(stats.comandosPorNombre || {}).sort((a, b) => b[1] - a[1]).slice(0, 5);
                const topDiv = document.getElementById('top-comandos');
                topDiv.innerHTML = top.length ? top.map(item => '<div class="flex justify-between items-center text-sm border-b border-white/5 pb-2"><span class="text-pink-400 font-bold">' + item[0] + '</span><span class="text-gray-300">' + item[1] + '</span></div>').join('') : '<p class="text-gray-500 text-sm">Todavía no hay comandos registrados.</p>';
                const horas = stats.mensajesPorHora || Array(24).fill(0);
                const maxHora = Math.max(...horas, 1);
                document.getElementById('actividad-horas').innerHTML = horas.map((valor, indice) => '<div title="' + indice + ':00 — ' + valor + ' mensajes" class="bg-blue-500/70 rounded-t" style="height:' + Math.max(4, Math.round(valor / maxHora * 100)) + '%"></div>').join('');

                const logRes = await fetch('/api/logs', { headers: { 'x-panel-token': currentToken } });
                const logs = await logRes.json();
                const logDiv = document.getElementById('logs');
                logDiv.innerHTML = logs.map(l => \`<div><span class="text-pink-500">[\${l.time}]</span> <span class="text-gray-300">\${l.msg}</span></div>\`).join('');
                logDiv.scrollTop = logDiv.scrollHeight;
            } catch(e) {}
        }

        async function cargarUsuarios() {
            const res = await fetch('/api/usuarios', { headers: { 'x-panel-token': currentToken } });
            const data = await res.json();
            const tbody = document.getElementById('tabla-usuarios-body');
            tbody.innerHTML = Object.entries(data).map(([jid, u]) => \`
                <tr class="border-b border-white/5 hover:bg-white/5">
                    <td class="p-3 font-mono text-xs">\${jid}</td>
                    <td class="p-3 text-pink-400 font-bold">\${u.diamantes || 0}</td>
                    <td class="p-3 text-blue-400">\${u.exp || 0}</td>
                    <td class="p-3">\${u.banned ? '<span class="text-red-500">BANEADO</span>' : '<span class="text-green-500">ACTIVO</span>'}</td>
                    <td class="p-3">
                        <button onclick="toggleBan('\${jid}', \${!u.banned})" class="px-3 py-1 rounded text-xs \${u.banned ? 'bg-green-600' : 'bg-red-600'} text-white font-bold">
                            \${u.banned ? 'Desbanear' : 'Banear'}
                        </button>
                    </td>
                </tr>
            \`).join('');
        }

        async function toggleBan(jid, estado) {
            await fetch('/api/usuarios/ban', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-panel-token': currentToken },
                body: JSON.stringify({ jid, banned: estado })
            });
            cargarUsuarios();
        }

        async function cargarConfig() {
            const res = await fetch('/api/config', { headers: { 'x-panel-token': currentToken } });
            const cfg = await res.json();
            document.getElementById('cfg-nombre').value = cfg.nombreBot || '';
            document.getElementById('cfg-prefijo').value = cfg.prefijo || '';
            document.getElementById('cfg-owner').value = cfg.owner ? cfg.owner[0] : '';
            document.getElementById('cfg-staff').value = (cfg.staff || []).map(s => (s.nombre || '') + '|' + (s.numero || '')).join(', ');
        }

        async function guardarConfiguracion(e) {
            e.preventDefault();
            const body = {
                nombreBot: document.getElementById('cfg-nombre').value,
                prefijo: document.getElementById('cfg-prefijo').value,
                owner: [document.getElementById('cfg-owner').value],
                staff: document.getElementById('cfg-staff').value.split(',').map(item => item.trim()).filter(Boolean).map(item => {
                    const partes = item.split('|');
                    return { nombre: (partes[0] || '').trim(), numero: (partes[1] || '').replace(/\D/g, '') };
                }).filter(item => item.nombre && item.numero)
            };
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-panel-token': currentToken },
                body: JSON.stringify(body)
            });
            if(res.ok) alert('Configuración guardada correctamente');
        }

        async function cargarSubbots() {
            const res = await fetch('/api/subbots', { headers: { 'x-panel-token': currentToken } });
            const bots = await res.json();
            const container = document.getElementById('lista-subbots');
            if(bots.length === 0) {
                container.innerHTML = '<p class="text-gray-500">No hay sub-bots activos.</p>';
                return;
            }
            container.innerHTML = bots.map(b => \`
                <div class="glass p-4 rounded-xl border border-white/10">
                    <p class="font-bold text-blue-400">JID: \${b.jid || 'Desconocido'}</p>
                    <p class="text-xs text-gray-400 mt-1">Conectado: \${b.conectado ? 'Sí' : 'No'}</p>
                    <button onclick="desconectarSub('\${b.jid}')" class="mt-4 w-full bg-red-600/20 text-red-400 border border-red-600/40 py-2 rounded-lg text-xs font-bold hover:bg-red-600 hover:text-white transition-all">Desconectar</button>
                </div>
            \`).join('');
        }

        async function desconectarSub(jid) {
            await fetch('/api/subbots/desconectar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-panel-token': currentToken },
                body: JSON.stringify({ jid })
            });
            cargarSubbots();
        }

        let comandosPanel = [];

        async function cargarComandos() {
            const res = await fetch('/api/comandos', { headers: { 'x-panel-token': currentToken } });
            comandosPanel = await res.json();
            renderizarComandos(comandosPanel);
        }

        function filtrarComandos() {
            const filtro = document.getElementById('filtro-comandos').value.toLowerCase();
            renderizarComandos(comandosPanel.filter(c => (c.nombre + ' ' + c.categoria + ' ' + c.desc).toLowerCase().includes(filtro)));
        }

        function renderizarComandos(comandos) {
            const tbody = document.getElementById('tabla-comandos-body');
            tbody.innerHTML = comandos.map(c => '<tr class="border-b border-white/5 hover:bg-white/5">' +
                '<td class="p-3 font-bold text-pink-400">' + c.nombre + '</td>' +
                '<td class="p-3 text-gray-400">' + c.categoria + '</td>' +
                '<td class="p-3 text-gray-300 max-w-sm">' + c.desc + '</td>' +
                '<td class="p-3 text-blue-400 font-bold">' + (c.uso || 0) + '</td>' +
                '<td class="p-3"><button onclick="toggleComando(\'' + c.nombre + '\', ' + (!c.activo) + ')" class="px-3 py-1 rounded text-xs ' + (c.activo ? 'bg-green-600' : 'bg-red-600') + ' text-white font-bold">' + (c.activo ? 'ACTIVO' : 'APAGADO') + '</button></td>' +
                '</tr>').join('');
        }

        async function toggleComando(nombre, activo) {
            const res = await fetch('/api/comandos/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-panel-token': currentToken },
                body: JSON.stringify({ nombre, activo })
            });
            if (res.ok) cargarComandos();
        }

        async function enviarBroadcast() {
            const mensaje = document.getElementById('bc-mensaje').value;
            if(!mensaje) return alert('Escribe un mensaje');
            if(!confirm('Este anuncio se enviará a todos los chats registrados. ¿Deseas continuar?')) return;
            const res = await fetch('/api/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-panel-token': currentToken },
                body: JSON.stringify({ mensaje })
            });
            if(res.ok) alert('Broadcast enviado con éxito');
        }

        async function ejecutarComando() {
            const cmd = document.getElementById('term-cmd').value;
            if(!cmd) return;
            const res = await fetch('/api/terminal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-panel-token': currentToken },
                body: JSON.stringify({ cmd })
            });
            const d = await res.json();
            document.getElementById('term-output').innerText = d.output || d.error;
        }

        async function reiniciarBot() {
            if(!confirm('¿Estás seguro de reiniciar el bot?')) return;
            await fetch('/api/restart', { method: 'POST', headers: { 'x-panel-token': currentToken } });
            alert('Reiniciando sistema...');
            location.reload();
        }

        if (currentToken) entrar();
    </script>
</body>
</html>`
}

export function iniciarPanel() {
  if (!config.panelActivo) return
  const app = express()
  app.use(express.json())
  
  app.get('/', (req, res) => res.send(paginaHtml()))
  
  app.get('/api/status', verificarToken, async (req, res) => {
    try {
      const db = await getDB()
      res.json({
        uptime: process.uptime().toFixed(0) + 's',
        ram: (process.memoryUsage().rss / 1024 / 1024).toFixed(1) + ' MB',
        usuarios: Object.keys(db.data.users || {}).length,
        subbots: listarSubbots ? listarSubbots().filter(s => s.conectado).length : 0,
        stats: db.data.stats || {}
      })
    } catch (e) { res.status(500).json({ error: 'Error' }) }
  })

  app.get('/api/logs', verificarToken, (req, res) => {
    res.json(logsBuffer)
  })

  app.get('/api/usuarios', verificarToken, async (req, res) => {
    try {
      const db = await getDB()
      res.json(db.data.users || {})
    } catch (e) { res.status(500).json({}) }
  })

  app.post('/api/usuarios/ban', verificarToken, async (req, res) => {
    try {
      const { jid, banned } = req.body
      const db = await getDB()
      if (db.data.users && db.data.users[jid]) {
        db.data.users[jid].banned = banned
        await db.write()
      }
      res.json({ status: 'ok' })
    } catch (e) { res.status(500).json({ error: 'Error' }) }
  })

  app.get('/api/config', verificarToken, (req, res) => {
    res.json(config)
  })

  app.post('/api/config', verificarToken, (req, res) => {
    try {
      const cambios = {}
      if (typeof req.body.nombreBot === 'string' && req.body.nombreBot.trim()) cambios.nombreBot = req.body.nombreBot.trim().slice(0, 40)
      if (typeof req.body.prefijo === 'string' && req.body.prefijo.trim()) cambios.prefijo = req.body.prefijo.trim().slice(0, 3)
      if (Array.isArray(req.body.owner)) cambios.owner = req.body.owner.map(String).map(n => n.replace(/\D/g, '')).filter(Boolean).slice(0, 5)
      if (Array.isArray(req.body.staff)) cambios.staff = req.body.staff.slice(0, 20)
      guardarConfig({ ...config, ...cambios })
      res.json({ status: 'ok' })
    } catch (e) { res.status(500).json({ error: 'Error' }) }
  })

  app.get('/api/comandos', verificarToken, async (req, res) => {
    try {
      const db = await getDB()
      const usos = db.data.stats?.comandosPorNombre || {}
      res.json(obtenerComandosPanel().map(c => ({ ...c, uso: usos[c.nombre] || 0 })))
    } catch (e) { res.status(500).json({ error: 'Error' }) }
  })

  app.post('/api/comandos/toggle', verificarToken, (req, res) => {
    try {
      const nombre = String(req.body.nombre || '').trim().toLowerCase()
      const activo = Boolean(req.body.activo)
      const existe = obtenerComandosPanel().some(c => c.nombre === nombre)
      if (!existe) return res.status(404).json({ error: 'Comando no encontrado' })
      const desactivados = new Set(config.comandosDesactivados || [])
      if (activo) desactivados.delete(nombre)
      else desactivados.add(nombre)
      const comandosDesactivados = [...desactivados]
      guardarConfig({ ...config, comandosDesactivados })
      res.json({ status: 'ok', comandosDesactivados })
    } catch (e) { res.status(500).json({ error: 'Error' }) }
  })

  app.get('/api/subbots', verificarToken, (req, res) => {
    try {
      res.json(listarSubbots ? listarSubbots() : [])
    } catch (e) { res.json([]) }
  })

  app.post('/api/subbots/desconectar', verificarToken, async (req, res) => {
    try {
      if (detenerSubbot && (req.body.numero || req.body.jid)) await detenerSubbot(req.body.numero || req.body.jid)
      res.json({ status: 'ok' })
    } catch (e) { res.status(500).json({ error: 'Error' }) }
  })

  app.post('/api/broadcast', verificarToken, async (req, res) => {
    try {
      const { mensaje } = req.body
      if (sockActivo) {
        const db = await getDB()
        const chats = Object.keys(db.data.chats || {})
        for (const chatId of chats) {
          await sockActivo.sendMessage(chatId, { text: `📢 *ANUNCIO OFICIAL*\n\n${mensaje}` })
        }
      }
      res.json({ status: 'ok' })
    } catch (e) { res.status(500).json({ error: 'Error' }) }
  })

  app.post('/api/terminal', verificarToken, (req, res) => {
    const cmd = String(req.body.cmd || '').trim()
    if (!COMANDOS_TERMINAL_SEGUROS.has(cmd)) return res.status(403).json({ error: 'Comando no permitido. Usa una opción de la lista segura.' })
    exec(cmd, { timeout: 10000 }, (error, stdout, stderr) => {
      res.json({ output: stdout || stderr || (error ? error.message : 'Ejecutado con éxito') })
    })
  })

  app.post('/api/restart', verificarToken, (req, res) => {
    res.json({ status: 'ok' })
    setTimeout(() => process.exit(0), 1000)
  })

  app.listen(config.panelPort, '0.0.0.0', () => {
    const token = obtenerToken()
    console.log('\n' + '═'.repeat(50))
    console.log('🌐 ULTRA DASHBOARD: http://localhost:' + config.panelPort)
    console.log('🔑 TOKEN ÚNICO: ' + token)
    console.log('═'.repeat(50) + '\n')
  })
}
