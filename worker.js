importScripts('module.js');

const Module = {};

wasm.instantiateWasmModule(Module)
.then(() => {
  onmessage = onMessage;
  postMessage("ready");
});

var data, imageData;

function ensureImageData(width, height) {
  if (data === undefined) {
    imageData = Module.createImageData(width, height);
    data = imageData.data;
  }

  if (imageData.width !== width || imageData.height !== height) {
    let byteLength = wasm.imageDataLength(width, height);
    if (byteLength <= data.byteLength) {
      /* reuse buffer from imageData */
      imageData = wasm.imageDataFrom(data.buffer, data.byteOffset, width, height)
    }
    else {
      /* allocate new memory */
      Module.disposeDataView(data);
      imageData = Module.createImageData(width, height);
      data = imageData.data;
    }
  }

  return imageData;
}

function onMessage(e) {
  var {w, h, x0, y0, dx, dy, iter} = e.data;
  var imageData = ensureImageData(w, h);

  Module.fractx(imageData.data.byteOffset, w, h, x0, y0, dx, dy, iter);

  /* we need to make a copy here
     the data wasm module has access to
     can't be used in other asynchronous contexts */
  imageData = new ImageData(imageData.data.slice(), imageData.width, imageData.height);

  retry();

  function retry() {
    createImageBitmap(imageData).then(imageBitmap => {
      postMessage(imageBitmap, [imageBitmap]);
    }, err => {
      console.error(err);
      setTimeout(retry, 1000);
    });
  }
}
