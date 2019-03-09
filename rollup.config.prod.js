import commonjs from 'rollup-plugin-commonjs'
import resolve from 'rollup-plugin-node-resolve'
import { terser } from 'rollup-plugin-terser'

export default {
  input: 'index.js',
  output: {
    file: 'dist/plotly-portal-viewer.min.js',
    format: 'umd',
    name: 'PortalViewer'
  },
  plugins: [
    resolve(), commonjs(), terser()
  ]
}
