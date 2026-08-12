import vinext from 'vinext';
import { defineConfig } from 'vite';

const cjsInteropDeps = [
  'hoist-non-react-statics',
  'prop-types',
  'react-is',
  '@emotion/react',
  '@emotion/cache',
  '@emotion/styled',
];

export default defineConfig({
  legacy: {
    inconsistentCjsInterop: true,
  },
  optimizeDeps: {
    include: cjsInteropDeps,
  },
  plugins: [vinext()],
  ssr: {
    optimizeDeps: {
      include: cjsInteropDeps,
    },
  },
});
