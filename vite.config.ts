
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // 關鍵：設定相對路徑，讓網頁可以在 Dropbox 資料夾直接開啟
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
})
