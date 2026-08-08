import chalk from 'chalk'
import os from 'os'

const purple = chalk.hex('#A020F0')
const pink = chalk.hex('#FF69B4')
const cyan = chalk.cyanBright
const gray = chalk.gray
const white = chalk.white

const ANCHO = 56
const BORDE_SUP = '╔' + '═'.repeat(ANCHO - 2) + '╗'
const BORDE_INF = '╚' + '═'.repeat(ANCHO - 2) + '╝'
const BORDE_LAT = '║'

function centrar(texto, ancho = ANCHO - 4) {
  const pad = Math.max(0, Math.floor((ancho - texto.length) / 2))
  return ' '.repeat(pad) + texto + ' '.repeat(ancho - texto.length - pad)
}

export function mostrarBannerInicio(nombreBot, version) {
  console.clear()
  const banner = `
${purple('  ████████╗██╗  ██╗███████╗██╗   ██╗██╗   ██╗██╗      ███╗   ███╗██████╗ ')}
${purple('  ╚══██╔══╝██║  ██║██╔════╝╚██╗ ██╔╝██║   ██║██║      ████╗ ████║██╔══██╗')}
${pink('     ██║   ███████║█████╗   ╚████╔╝ ██║   ██║██║█████╗██╔████╔██║██║  ██║')}
${pink('     ██║   ██╔══██║██╔══╝    ╚██╔╝  ██║   ██║██║╚════╝██║╚██╔╝██║██║  ██║')}
${cyan('     ██║   ██║  ██║███████╗   ██║   ╚██████╔╝██║      ██║ ╚═╝ ██║██████╔╝')}
${cyan('     ╚═╝   ╚═╝  ╚═╝╚══════╝   ╚═╝    ╚═════╝ ╚═╝      ╚═╝     ╚═╝╚═════╝ ')}
  `
  console.log(banner)
  
  console.log(purple(BORDE_SUP))
  console.log(`${purple(BORDE_LAT)}  ${centrar(white.bold('SISTEMA DE CONTROL DE ASISTENTE VIRTUAL'))}  ${purple(BORDE_LAT)}`)
  console.log(`${purple(BORDE_LAT)}  ${centrar(gray(`Versión: ${version} | Host: ${os.hostname()}`))}  ${purple(BORDE_LAT)}`)
  console.log(purple(BORDE_INF))
  console.log('')
}

export function mostrarResumenComandos(listaComandos) {
  const porCategoria = {}
  for (const c of listaComandos) {
    const cat = c.categoria || 'main'
    porCategoria[cat] = (porCategoria[cat] || 0) + 1
  }

  console.log(cyan('  📊 ESTADÍSTICAS DE CARGA'))
  console.log(gray('  ' + '─'.repeat(ANCHO - 4)))
  
  const total = listaComandos.length
  console.log(`  ${white('● Total Comandos:')} ${pink.bold(total)}`)
  console.log('')

  const categorias = Object.entries(porCategoria).sort()
  for (let i = 0; i < categorias.length; i += 2) {
    const [cat1, cant1] = categorias[i]
    const [cat2, cant2] = categorias[i + 1] || ['', '']
    
    let fila = `  ${cyan('📂')} ${white(cat1.padEnd(12))}: ${pink(String(cant1).padStart(3))}`
    if (cat2) {
      fila += `    ${cyan('📂')} ${white(cat2.padEnd(12))}: ${pink(String(cant2).padStart(3))}`
    }
    console.log(fila)
  }
  
  console.log(gray('  ' + '─'.repeat(ANCHO - 4)))
  console.log('')
}

export function mostrarConexionExitosa(nombreBot) {
  const fecha = new Date().toLocaleString('es-ES', { 
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })

  console.log(pink('  ╔' + '═'.repeat(ANCHO - 6) + '╗'))
  console.log(`  ${pink('║')}  ${chalk.green.bold('⚡ ' + nombreBot.toUpperCase() + ' EN LÍNEA')}  ${pink('║')}`)
  console.log(`  ${pink('║')}  ${gray('Estado: Autenticado y Listo')}   ${pink('║')}`)
  console.log(`  ${pink('║')}  ${gray('Fecha: ' + fecha)}     ${pink('║')}`)
  console.log(pink('  ╚' + '═'.repeat(ANCHO - 6) + '╝'))
  console.log('')
}
