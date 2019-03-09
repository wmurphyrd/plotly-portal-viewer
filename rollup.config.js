import commonjs from 'rollup-plugin-commonjs'
import resolve from 'rollup-plugin-node-resolve'

export default {
  input: 'index.js',
  output: {
    file: 'dist/plotportal.js',
    format: 'umd',
    name: 'PlotPortal'
  },
  plugins: [
    resolve(), commonjs()
  ]
}
