const fs = require('fs')
const path = require('path')
const os = require('os')
const crypto = require('crypto')
const { spawn } = require('child_process')

const API_URL =
  'https://familybot-md-api.onrender.com/api/anime/reaction?apiKey=familybot-md&type=hug'

const TIMEOUT = 30000

function createTempDir() {
  const dir = path.join(
    os.tmpdir(),
    `familybot-hug-${crypto.randomBytes(8).toString('hex')}`
  )

  fs.mkdirSync(dir, {
    recursive: true
  })

  return dir
}

function removeTempDir(dir) {
  try {
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, {
        recursive: true,
        force: true
      })
    }
  } catch (error) {
    console.error(
      'Error limpiando temporales:',
      error.message
    )
  }
}

async function fetchTimeout(url, options = {}, timeout = TIMEOUT) {
  const controller = new AbortController()

  const timer = setTimeout(() => {
    controller.abort()
  }, timeout)

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    })
  } finally {
    clearTimeout(timer)
  }
}

async function getGifUrl() {
  const response = await fetchTimeout(
    API_URL,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'FamilyBot-MD'
      }
    }
  )

  if (!response.ok) {
    throw new Error(
      `API HTTP ${response.status}`
    )
  }

  const data = await response.json()

  if (!data || data.status !== true) {
    throw new Error(
      data?.message ||
      'La API no devolvió una reacción'
    )
  }

  const url =
    data.url ||
    data.image ||
    data.imageUrl ||
    data.gif ||
    data.gifUrl

  if (!url) {
    throw new Error(
      'La API no devolvió URL'
    )
  }

  try {
    new URL(url)
  } catch {
    throw new Error(
      'URL de imagen inválida'
    )
  }

  return url
}

async function downloadGif(url, file) {
  const response = await fetchTimeout(
    url,
    {
      method: 'GET',
      headers: {
        Accept:
          'image/gif,image/webp,image/apng,image/*,*/*;q=0.8',
        'User-Agent': 'FamilyBot-MD'
      }
    }
  )

  if (!response.ok) {
    throw new Error(
      `Descarga HTTP ${response.status}`
    )
  }

  const contentType =
    response.headers.get(
      'content-type'
    ) || ''

  if (
    !contentType.startsWith('image/')
  ) {
    throw new Error(
      `El servidor devolvió ${contentType}`
    )
  }

  const buffer = Buffer.from(
    await response.arrayBuffer()
  )

  if (!buffer.length) {
    throw new Error(
      'El archivo descargado está vacío'
    )
  }

  fs.writeFileSync(
    file,
    buffer
  )

  return file
}

function convertToMp4(input, output) {
  return new Promise(
    (resolve, reject) => {
      const ffmpeg =
        spawn('ffmpeg', [
          '-y',
          '-hide_banner',
          '-loglevel',
          'error',
          '-i',
          input,
          '-vf',
          'fps=15,scale=480:-2:flags=lanczos,format=yuv420p',
          '-c:v',
          'libx264',
          '-preset',
          'veryfast',
          '-crf',
          '28',
          '-movflags',
          '+faststart',
          '-an',
          output
        ])

      let stderr = ''

      const timer = setTimeout(() => {
        ffmpeg.kill('SIGKILL')

        reject(
          new Error(
            'FFmpeg tardó demasiado'
          )
        )
      }, TIMEOUT)

      ffmpeg.stderr.on(
        'data',
        data => {
          stderr += data.toString()
        }
      )

      ffmpeg.on(
        'error',
        error => {
          clearTimeout(timer)

          if (
            error.code ===
            'ENOENT'
          ) {
            reject(
              new Error(
                'FFmpeg no está instalado'
              )
            )
          } else {
            reject(error)
          }
        }
      )

      ffmpeg.on(
        'close',
        code => {
          clearTimeout(timer)

          if (
            code !== 0
          ) {
            reject(
              new Error(
                stderr ||
                `FFmpeg terminó con código ${code}`
              )
            )

            return
          }

          if (
            !fs.existsSync(output)
          ) {
            reject(
              new Error(
                'FFmpeg no creó el MP4'
              )
            )

            return
          }

          const size =
            fs.statSync(output).size

          if (!size) {
            reject(
              new Error(
                'El MP4 está vacío'
              )
            )

            return
          }

          resolve(output)
        }
      )
    }
  )
}

async function prepareVideo() {
  const tempDir =
    createTempDir()

  const gifFile =
    path.join(
      tempDir,
      'reaction.gif'
    )

  const mp4File =
    path.join(
      tempDir,
      'reaction.mp4'
    )

  try {
    const gifUrl =
      await getGifUrl()

    await downloadGif(
      gifUrl,
      gifFile
    )

    await convertToMp4(
      gifFile,
      mp4File
    )

    const video =
      fs.readFileSync(
        mp4File
      )

    if (!video.length) {
      throw new Error(
        'MP4 inválido'
      )
    }

    return {
      buffer: video,
      tempDir
    }
  } catch (error) {
    removeTempDir(
      tempDir
    )

    throw error
  }
}

async function sendHug({
  sock,
  chatId,
  m
}) {
  let tempDir = null

  try {
    console.log(
      '🤗 Obteniendo abrazo...'
    )

    const result =
      await prepareVideo()

    tempDir =
      result.tempDir

    console.log(
      '🎬 GIF convertido a MP4 correctamente'
    )

    await sock.sendMessage(
      chatId,
      {
        video: result.buffer,
        mimetype:
          'video/mp4',
        gifPlayback: true,
        caption:
          '🤗 *¡Abrazo enviado!* 🌿\n\n_FamilyBot-MD_'
      },
      {
        quoted: m
      }
    )

    console.log(
      '✅ Abrazo enviado correctamente'
    )

  } catch (error) {
    console.error(
      '❌ Error en abrazo.js:',
      error
    )

    try {
      await sock.sendMessage(
        chatId,
        {
          text:
            '❌ No pude enviar el abrazo en este momento. Intenta nuevamente.'
        },
        {
          quoted: m
        }
      )
    } catch (sendError) {
      console.error(
        '❌ Error enviando mensaje de error:',
        sendError
      )
    }

  } finally {
    if (tempDir) {
      removeTempDir(
        tempDir
      )

      console.log(
        '🧹 Archivos temporales eliminados'
      )
    }
  }
}

module.exports = {
  name: 'abrazo',
  aliases: [
    'hug'
  ],
  description:
    'Envía un abrazo animado',
  execute: sendHug,
  run: sendHug
}