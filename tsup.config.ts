import { defineConfig } from 'tsup'

export default defineConfig({
  name: 'secure-vm',
  entry: ['src/index.ts'],
  dts: true,
  target: ['es2021'],
  format: ['esm', 'cjs', 'iife'],
  outDir: 'dist',
  banner: { js: '/// Copyright (c) FurryR 2023. This project is licensed under the MIT license.\n/// Original repository: https://github.com/FurryR/secure-vm\n' },
  sourcemap: true,
  minify: true,
  clean: true,
  globalName: 'SecureVM'
})
