import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Vite's native JSX transform reads react-jsx from tsconfig. Avoid injecting
  // window-based React Fast Refresh into the PDF worker's shared TSX modules.
  base: process.env.GITHUB_ACTIONS ? '/ResumeStudio/' : '/',
  worker: { format: 'es' },
  optimizeDeps: { include: ['react', 'react-dom/client', '@react-pdf/renderer', 'pdfjs-dist'] },
  test: { include: ['tests/unit/**/*.test.ts'] },
});
