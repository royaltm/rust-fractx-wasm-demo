import {
  ArrayBuffer,
  Uint8Array,
  Uint8ClampedArray,
  WebAssembly,
  ImageData,
  TextDecoder
} from 'global';

export const PAGE_SIZE = 65536;

export function bufferViewOf(constr, buffer, byteOffset, length) {
  if (ArrayBuffer.isView(buffer)) {
    byteOffset += buffer.byteOffset;
    buffer = buffer.buffer;
  }
  return new constr(buffer, byteOffset, length);
}

export function imageDataLength(width, height) {
  return width * height * 4;
}

export function fetchAndInstantiate(url, importObject) {
  var promise = fetch(url);
  if ('function' === typeof WebAssembly.instantiateStreaming) {
    return WebAssembly.instantiateStreaming(promise, importObject);
  }
  else {
    /* fallback to "legacy" slow method */
    return promise
    .then(response => response.arrayBuffer())
    .then(bytes => WebAssembly.instantiate(bytes, importObject));
  }
}

// Currently only FF allows to serialize a WebAssembly.Module
export function fetchAndSend(url, worker) {
  var promise = fetch(url);
  if ('function' === typeof WebAssembly.compileStreaming) {
    promise = WebAssembly.compileStreaming(promise);
  }
  else {
    /* fallback to "legacy" slow method */
    promise = promise
    .then(response => response.arrayBuffer())
    .then(bytes => WebAssembly.compile(bytes));
  }

  return promise.then(module => {
    worker.postMessage(module);
    return {module, worker};
  });
}

export function readCStringFrom(buffer, offset) {
  var view = bufferViewOf(Uint8Array, buffer, offset);
  let blen = view.indexOf(0);
  if (blen < 0) throw new Error("could not read a cstring");
  buffer = new Uint8Array(view.buffer, offset, blen);
  return new TextDecoder().decode(buffer);
}

export function imageDataFrom(buffer, offset, width, height) {
  var length = imageDataLength(width, height);
  var view = bufferViewOf(Uint8ClampedArray, buffer, offset, length);
  return new ImageData(view, width, height);
}
