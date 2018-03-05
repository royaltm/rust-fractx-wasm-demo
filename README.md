FractX WebAssembly Demo
=======================

This is my first WebAssembly program.

See [live demo](http://yeondir.com/fractx-demo/)!

Building
--------

### Prerequisites

- [Rust](https://www.rust-lang.org/) via [rustup](https://www.rustup.rs)
- `rustup install nightly`
- `rustup target add wasm32-unknown-unknown --toolchain nightly`
- `cargo +stable install wasm-gc`
- `wasm-opt` from [binaryen](https://github.com/WebAssembly/binaryen#building)
- `npm` from [nodejs](https://nodejs.org/)
- `npm i -g rollup`


### Build all with just

```
cargo +stable install just
just fetch
just
```

### Build WebAssembly

First we need to build a `.wasm` file:

```sh
cargo +nightly build --lib --target wasm32-unknown-unknown --release
```

Then we should gc unused parts with:

```sh
wasm-gc target/wasm32-unknown-unknown/release/fractx_wasm_demo.wasm -o static/fractx_wasm_demo.gc.wasm
```

We may even try to optimise it even further with:

```sh
wasm-opt -O3 static/fractx_wasm_demo.gc.wasm -o static/fractx_wasm_demo.gc.opt.wasm
```

### Build javascript

Go to the root of the project and just run:

```sh
rollup -c
```

### Test

Now point some http server to serve files from `static` directory.
Make sure it has mime type: `application/wasm` assigned to `.wasm` files.
On windows one may use this [registry file](resources/wasm.mime-type.reg).

I'am quite used to [devd](https://github.com/cortesi/devd/releases), e.g.:

```
devd static -o
```


Links
-----

Usefull WebAssembly and Rust related links:

- http://webassembly.org/docs/portability/#assumptions-for-efficient-execution
- https://webassembly.github.io/spec/
- https://www.hellorust.com
- https://github.com/rust-lang-nursery/rust-wasm#rust-and-webassembly-book
- https://mgattozzi.com/rust-wasm
- https://github.com/alexcrichton/wasm-bindgen
- https://github.com/koute/stdweb
