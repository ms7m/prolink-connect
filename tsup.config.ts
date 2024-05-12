import { kaitaiLoader } from 'esbuild-plugin-kaitai/dist/index.js';
import KaitaiStructCompiler from 'kaitai-struct-compiler';
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  format: ['esm'],  
  esbuildPlugins: [
    kaitaiLoader({
      compiler: new KaitaiStructCompiler(),
    }),
  ],
});