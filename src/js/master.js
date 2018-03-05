import WorkerAsyncQueue from './queue.js'
import { createCanvas, getEventLocation } from './tools.js'
import Promise from './promise';
import window from 'global';

const document = window.document;
const Module = {};
const Sandbox = {};

const layouts = ['fullscreen', 'halfscreen', 'constscreen'];

const MAX_ITER = 5000;

class Fractal {
  constructor({width, height}) {
    this.iter = 100;
    this.resetWindow(width, height);
  }

  resetWindow(w, h) {
    var scale = 1 / Math.min(w, h) * 2.5;
    this.x0 = -0.75 - w*scale/2;
    this.y0 = -h*scale/2;
    this.dx = scale;
    this.dy = scale;
  }

  assignWindow(x0, y0, dx, dy) {
    this.x0 = x0;
    this.y0 = y0;
    this.dx = dx;
    this.dy = dy;
  }

  viewCoords(x, y) {
    return { x: this.x0 + x*this.dx, y: this.y0 + y*this.dy };
  }

  viewBox(w, h) {
    return { x0: this.x0, y0: this.y0, x1: this.x0 + w*this.dx, y1: this.y0 + h*this.dy };
  }

  fractx(queue, w, h, ctx) {
    var { x0, y0, dx, dy, iter } = this;
    return queue.task({w, h, x0, y0, dx, dy, iter})
    .then(image => ctx.drawImage(image, 0, 0));
  }

  resize(w0, h0, w1, h1) {
    let d = Math.min(w0, h0) / Math.min(w1, h1);
    let dx = this.dx;
    let dy = this.dy;
    let x = this.x0 + w0*dx/2;
    let y = this.y0 + h0*dy/2;
    dx = (this.dx *= d);
    dy = (this.dy *= d);
    this.x0 = x - w1*dx/2;
    this.y0 = y - h1*dy/2;
  }

  load() {
    var serial = window.localStorage.getItem('fractx');
    if (serial) {
      try {
        let obj = JSON.parse(serial);
        let keys = Object.keys(this);
        let {width, height, meta} = obj;
        if (meta !== null && 'object' === typeof meta &&
            Number.isFinite(width) && width % 1 === 0 &&
            Number.isFinite(height) && height % 1 === 0 &&
            keys.every(n => Number.isFinite(obj[n]))) {
          keys.forEach(n => this[n] = obj[n]);
          this.iter = Math.max(Math.min(this.iter|0, MAX_ITER), 1);
          return {width, height, meta};
        }
      } catch(e) {};
    }
  }

  save(width, height, meta) {
    var { x0, y0, dx, dy, iter } = this;
    var data = JSON.stringify({ x0, y0, dx, dy, iter, width, height, meta });
    window.localStorage.setItem('fractx', data);
  }

  zoom(x, y, w, h, mag) {
    let { x0, y0, dx, dy } = this;
    Module.zoom_at(w, h, x0, y0, dx, dy, x, y, mag); /* calls zoom_result */
  }
}

function zoom_result(x0, y0, dx, dy) {
  Sandbox.fractal.assignWindow(x0, y0, dx, dy);
}

class Splitter {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.vsync = true;
  }

  fractx(fractal, queue, width, height, ctx) {
    var {cols, rows} = this
      , { x0, y0, dx, dy, iter } = fractal
      , vsync = this.vsync
      , sink = []
      , segw = width / cols
      , segh = height / rows

    for(let c = 0; c < cols; ++c) {
      let px = c * width / cols >>>0;
      let w = ((c + 1) * width / cols >>>0) - px;
      let x = x0 + px*dx;
      for(let r = 0; r < rows; ++r) {
        let py = r * height / rows >>>0;
        let h = ((r + 1) * height / rows >>>0) - py;
        let y = y0 + py*dy;
        let prom = queue.task({w, h, x0:x, y0:y, dx, dy, iter});
        if (vsync) {
          /* postpone draw */
          prom = prom.then(image => () => {
            ctx.drawImage(image, px, py)
            image = null; /* dispose bitmap sooner */
          });
        }
        else {
          /* draw asap */
          prom = prom.then(image => {
            ctx.drawImage(image, px, py)
            image = null; /* dispose bitmaps sooner */
          });
        }
        sink.push(prom);
      }
    }
    if (vsync) {
      return Promise.all(sink).then(closures => {
        window.requestAnimationFrame(() => {
          closures.forEach(c => c())
          closures = null; /* dispose bitmaps sooner */
        });
      });
    }
    else {
      return Promise.all(sink);
    }
  }
}

wasm.instantiateWasmModule(Module, {zoom_result})
.then(() => {
  Sandbox.queue = new WorkerAsyncQueue("worker.js");
  Sandbox.body = document.getElementsByTagName("body")[0];
  Sandbox.canvas = createCanvas("fractx", Sandbox.body);
  Sandbox.ctx = Sandbox.canvas.getContext("2d");
  Sandbox.fractal = new Fractal(Sandbox.canvas);
  Sandbox.splitter = new Splitter(16, 8);

  ["iterations", "vsync", "x", "y", "x0", "y0", "x1", "y1", "reset", "help", "about", "bottom-info", "top-info"].forEach(n => {
    Sandbox[n] = document.getElementById(n);
  });

  Sandbox.aboutPopper = new window.Popper(Sandbox.help, Sandbox.about, {placement: 'left'});
  Sandbox.about.addEventListener("click", (ev) => { ev.stopPropagation(); });
  Sandbox.body.addEventListener("click", (ev) => {
    Sandbox.about.classList.remove('show');
  });
  Sandbox.help.addEventListener("click", (ev) => {
    Sandbox.about.classList.toggle('show');
    ev.stopPropagation();
  });

  Sandbox.layout = layouts[0];
  Sandbox.setLayout = function(layout) {
    var index = layouts.indexOf(layout);
    if (index >= 0) {
      let prev = Sandbox.layout;
      Sandbox.layout = layout;
      layouts.forEach(l => Sandbox[l].classList[l===layout ? 'add' : 'remove']('active'));
      return prev;
    }
  };

  Sandbox.updateViewBox = () => {
    var { width, height } = Sandbox.canvas;
    var vb = Sandbox.fractal.viewBox(width, height);
    for(let coord in vb) Sandbox[coord].value = vb[coord];
  };

  Sandbox.vsync.checked = Sandbox.splitter.vsync;
  Sandbox.iterations.value = Sandbox.fractal.iter;

  Sandbox.vsync.addEventListener("change", (_) => {
    Sandbox.splitter.vsync = Sandbox.vsync.checked;
  });

  Sandbox.canvas.addEventListener("mousemove", (ev) => {
    var {x, y} = getEventLocation(ev.target, ev);
    var {x, y} = Sandbox.fractal.viewCoords(x, y);
    Sandbox.x.value = x;
    Sandbox.y.value = y;
  });

  Sandbox.queue.ready().then(() => {
    ["bottom-info", "top-info"].forEach(id => {
      Sandbox[id].classList.add('show');
    });

    layouts.map(n => document.getElementById(n))
    .forEach(elm => {
      const layout = elm.id;
      elm.addEventListener("click", (_) => {
        if (layout != Sandbox.layout) {
          Sandbox.setLayout(layout);
          resize();
        }
      });
      Sandbox[elm.id] = elm;
    });

    ["incr-iter", "decr-iter"].map(n => document.getElementById(n))
    .forEach(elm => elm.addEventListener("click", (_) => {
      var iter = Sandbox.fractal.iter;
      if (elm.id === "incr-iter") {
        iter = Math.min(MAX_ITER, iter*2 >>>0);
      }
      else {
        iter = Math.max(1, iter/2 >>> 0);
      }
      Sandbox.fractal.iter = Sandbox.iterations.value = iter;
      run();
    }));

    Sandbox.reset.addEventListener("click", (_) => {
      var {width, height} = Sandbox.canvas;
      Sandbox.fractal.resetWindow(width, height);
      run();
    });

    Sandbox.iterations.addEventListener("input", (_) => {
      var iter = parseInt(Sandbox.iterations.value);
      if (isFinite(iter)) {
        iter = Math.max(Math.min(iter|0, MAX_ITER), 1);
        Sandbox.iterations.value = iter;
        Sandbox.fractal.iter = iter;
        run();
      }
    }, false);

    Sandbox.canvas.addEventListener("wheel", (ev) => {
      let {x, y} = getEventLocation(ev.target, ev);
      let {width, height} = Sandbox.canvas;
      let mag = 0.75;
      if (ev.deltaY > 0) mag = 1/mag;
      Sandbox.fractal.zoom(x, y, width, height, mag);
      Sandbox.updateViewBox();
      run();
    }, false);

    Sandbox.canvas.addEventListener("click", (ev) => {
      let {x, y} = getEventLocation(ev.target, ev);
      let {width, height} = Sandbox.canvas;
      Sandbox.fractal.zoom(x, y, width, height, 0.75);
      Sandbox.updateViewBox();
      run();
    }, false);

    window.addEventListener('resize', resize, false);

    Sandbox.updateViewBox();
    let saved = Sandbox.fractal.load();
    if (saved && saved.meta && Sandbox.setLayout(saved.meta.layout)) {
      let canvas = Sandbox.canvas;
      canvas.width = saved.width;
      canvas.height = saved.height;
      Sandbox.iterations.value = Sandbox.fractal.iter;
      resize();
    }
    else {
      Sandbox.setLayout(layouts[0]);
      run();
    }
  });
});

function resizeCanvas(canvas, layout) {
  var width, height;
  switch(layout) {
    case 'fullscreen':
      width = window.innerWidth;
      height = window.innerHeight;
      break;
    case 'halfscreen':
      width = window.innerWidth >>> 1;
      height = window.innerHeight >>> 1;
      break;
    case 'constscreen':
      width = 700;
      height = 400;
  }
  if (width != canvas.width) canvas.width = width;
  if (height != canvas.height) canvas.height = height;
  canvas.style.left = (window.innerWidth - width) / 2 + 'px';
  canvas.style.top = (window.innerHeight - height) / 2 + 'px';
  return canvas;
}

function resize() {
  var canvas = Sandbox.canvas;
  let {width, height} = canvas;
  resizeCanvas(canvas, Sandbox.layout);
  Sandbox.fractal.resize(width, height, canvas.width, canvas.height);
  Sandbox.updateViewBox();
  run();
}

function run() {
  var canvas = Sandbox.canvas;
  let {width, height} = canvas;
  Sandbox.queue.cancelPending();
  Sandbox.splitter.fractx(Sandbox.fractal, Sandbox.queue, width, height, Sandbox.ctx)
  .then(() => {
    Sandbox.fractal.save(width, height, {layout: Sandbox.layout});
  },
  err => { /* job canceled */
    if (err.message !== 'job canceled') throw Error(err);
  });
}
