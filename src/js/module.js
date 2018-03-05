export * from './wasm-helpers.js'
import { fetchAndInstantiate, imageDataFrom } from './wasm-helpers.js'
import { WebAssembly, ArrayBuffer } from 'global';

export const MODULE_URL = 'fractx_wasm_demo.gc.opt.wasm';

export function instantiateWasmModule(Module, env) {
  const memory = new WebAssembly.Memory({initial: 20});

  env = Object.assign({
    zoom_result(x0, y0, x1, y1) {}
  }, env, {memory});

  const allocCache = new Set();

  return fetchAndInstantiate(MODULE_URL, {env})
  .then(mod => {
    Object.assign(Module, mod.instance.exports, {
      memory,

      createImageData(w, h) {
        var ptr = Module.alloc_image_data(w, h);
        var img = imageDataFrom(memory.buffer, ptr, w, h);
        allocCache.add(img.data);
        return img;
      },

      disposeDataView(view) {
        if (!ArrayBuffer.isView(view)) {
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
