import { createRequire } from 'node:module'
const sharp = createRequire(import.meta.url)('C:/Users/krime/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp')
const sources = {
  900001: 'exec-5ce997ed-ac11-4f3e-bd63-46586c4317fe.png',
  900002: 'exec-1d7398d1-e3de-4db0-9cd2-10c3cb81ad6d.png',
  900003: 'exec-07c60474-f906-4f97-aedb-91d9efa06e22.png',
}
for (const [id, file] of Object.entries(sources)) {
  const info = await sharp('C:/Users/krime/.codex/generated_images/01a07b77-d28a-7470-8233-555471448fc2/' + file)
    .webp({ quality: 90 }).toFile(`public/assets/demo/supplement-${id}-photo.webp`)
  console.log({ id, width: info.width, height: info.height, bytes: info.size })
}
