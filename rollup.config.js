import commonjs from 'rollup-plugin-commonjs'
import resolve from 'rollup-plugin-node-resolve'

export default {
  input: 'index.js',
  output: {
    file: 'dist/plotly-portal-viewer.js',
    format: 'umd',
    name: 'PortalViewer'
  },
  plugins: [
    resolve(), commonjs()
  ]
}
