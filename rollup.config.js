export default [{
  input: 'src/js/module.js',
  output: {
    file: 'static/module.js',
    name: 'wasm',
    format: 'iife',
    sourcemap: true,
    extend: false,
    interop: false,
    globals: {
      global: 'this'
    }
  },
  external: ['global'],
  plugins: []
},{
  input: 'src/js/master.js',
  output: {
    file: 'static/master.js',
    format: 'iife',
    sourcemap: true,
    extend: false,
    interop: false,
    globals: {
      promise: 'Promise',
      global: 'this'
    }
  },
  external: ['promise', 'global'],
  plugins: []
}];
