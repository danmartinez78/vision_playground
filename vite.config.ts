import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { createReadStream, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

// the cross-origin isolation headers nginx sends, so multithreaded WebAssembly works
const ISOLATION = { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' }

// ONNX Runtime Web loads its WebAssembly files at run time. This serves them
// at /ort/ in dev and copies them into the build.
const ORT_DIR = join(import.meta.dirname, 'node_modules/onnxruntime-web/dist')
const ORT_FILES = [
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.jsep.wasm',
  'ort-wasm-simd-threaded.jsep.mjs',
]

function ortFiles(): Plugin {
  return {
    name: 'ort-files',
    configureServer(server) {
      server.middlewares.use('/ort/', (req, res, next) => {
        const file = (req.url ?? '').slice(1).split('?')[0]
        if (!ORT_FILES.includes(file)) return next()
        res.setHeader('Content-Type', file.endsWith('.wasm') ? 'application/wasm' : 'text/javascript')
        // its worker threads load these too, and need the isolation headers
        for (const [k, v] of Object.entries(ISOLATION)) res.setHeader(k, v)
        createReadStream(join(ORT_DIR, file)).pipe(res)
      })
    },
    generateBundle() {
      for (const file of ORT_FILES) {
        this.emitFile({ type: 'asset', fileName: `ort/${file}`, source: readFileSync(join(ORT_DIR, file)) })
      }
    },
  }
}

// Browsers cache the sample data for a week, so the app asks for it with a
// version made from its contents. A changed answer key then loads at once.
const DATA_FILES = ['index.json', 'bioclip.json', 'species/index.json']
const dataVersion = createHash('sha256')
DATA_FILES.forEach((f) => dataVersion.update(readFileSync(join(import.meta.dirname, 'public/samples/ami-traps', f))))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), ortFiles()],
  define: { __DATA_VERSION__: JSON.stringify(dataVersion.digest('hex').slice(0, 10)) },
  optimizeDeps: { exclude: ['onnxruntime-web'] },
  server: { headers: ISOLATION },
  preview: { headers: ISOLATION },
})
