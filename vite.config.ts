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
  plugins: [vinext()],
  legacy: {
    inconsistentCjsInterop: true,
  },
  optimizeDeps: {
    include: cjsInteropDeps,
  },
  ssr: {
    optimizeDeps: {
      include: cjsInteropDeps,
    },
  },
});
