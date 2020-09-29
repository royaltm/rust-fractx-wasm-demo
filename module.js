var wasm = (function (exports,global) {
  'use strict';

  const PAGE_SIZE = 65536;

  function bufferViewOf(constr, buffer, byteOffset, length) {
    if (global.ArrayBuffer.isView(buffer)) {
      byteOffset += buffer.byteOffset;
      buffer = buffer.buffer;
    }
    return new constr(buffer, byteOffset, length);
  }

  function imageDataLength(width, height) {
    return width * height * 4;
  }

  function fetchAndInstantiate(url, importObject) {
    var promise = fetch(url);
    if ('function' === typeof global.WebAssembly.instantiateStreaming) {
      return global.WebAssembly.instantiateStreaming(promise, importObject);
    }
    else {
      /* fallback to "legacy" slow method */
      return promise
      .then(response => response.arrayBuffer())
      .then(bytes => global.WebAssembly.instantiate(bytes, importObject));
    }
  }

  // Currently only FF allows to serialize a WebAssembly.Module
  function fetchAndSend(url, worker) {
    var promise = fetch(url);
    if ('function' === typeof global.WebAssembly.compileStreaming) {
      promise = global.WebAssembly.compileStreaming(promise);
    }
    else {
      /* fallback to "legacy" slow method */
      promise = promise
      .then(response => response.arrayBuffer())
      .then(bytes => global.WebAssembly.compile(bytes));
    }

    return promise.then(module => {
      worker.postMessage(module);
      return {module, worker};
    });
  }

  function readCStringFrom(buffer, offset) {
    var view = bufferViewOf(global.Uint8Array, buffer, offset);
    let blen = view.indexOf(0);
    if (blen < 0) throw new Error("could not read a cstring");
    buffer = new global.Uint8Array(view.buffer, offset, blen);
    return new global.TextDecoder().decode(buffer);
  }

  function imageDataFrom(buffer, offset, width, height) {
    var length = imageDataLength(width, height);
    var view = bufferViewOf(global.Uint8ClampedArray, buffer, offset, length);
    return new global.ImageData(view, width, height);
  }

  const MODULE_URL = 'fractx_wasm_demo.gc.opt.wasm';

  function instantiateWasmModule(Module, env) {
    // const memory = new WebAssembly.Memory({initial: 20});

    env = Object.assign({
      zoom_result(x0, y0, x1, y1) {}
    // }, env, {memory});
    }, env);

    const allocCache = new Set();

    return fetchAndInstantiate(MODULE_URL, {env})
    .then(mod => {
      const memory = mod.instance.exports.memory;
      Object.assign(Module, mod.instance.exports, {
        memory,

        createImageData(w, h) {
          var ptr = Module.alloc_image_data(w, h);
          var img = imageDataFrom(memory.buffer, ptr, w, h);
          allocCache.add(img.data);
          return img;
        },

        disposeDataView(view) {
          if (!global.ArrayBuffer.isView(view)) {
            throw new TypeError("disposeDataView: view is not a view over ArrayBuffer");
          }
          var {buffer, byteOffset, byteLength} = view;
          if (buffer !== memory.buffer) {
            throw new Error("disposeDataView: memory was not allocated for module");
          }
          if (allocCache.delete(view)) {
            Module.dispose_memory(byteOffset, byteLength);
          }
        },    

        disposeImageData(image) {
          Module.disposeDataView(image.data);
        }
      });

      return mod;
    });
  }

  exports.MODULE_URL = MODULE_URL;
  exports.instantiateWasmModule = instantiateWasmModule;
  exports.PAGE_SIZE = PAGE_SIZE;
  exports.bufferViewOf = bufferViewOf;
  exports.imageDataLength = imageDataLength;
  exports.fetchAndInstantiate = fetchAndInstantiate;
  exports.fetchAndSend = fetchAndSend;
  exports.readCStringFrom = readCStringFrom;
  exports.imageDataFrom = imageDataFrom;

  return exports;

}({},this));
//# sourceMappingURL=module.js.map
