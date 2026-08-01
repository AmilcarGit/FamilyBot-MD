import { createJimp } from '@jimp/core'
import { defaultFormats, defaultPlugins } from 'jimp'
import webp from '@jimp/wasm-webp'

export const JimpWebp = createJimp({
  formats: [...defaultFormats, webp],
  plugins: defaultPlugins,
})
