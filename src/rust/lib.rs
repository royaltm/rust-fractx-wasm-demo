#![feature(wasm_import_memory)]
#![wasm_import_memory]

extern crate fractx;

use std::mem;
#[allow(unused_imports)]
use std::os::raw::{c_char, c_void};

use fractx::buffer::Buffer;
use fractx::fractal::Fractal;

/* imports from js */
extern {
    fn zoom_result(x0: f64, y0: f64, x1: f64, y1: f64);
}

/* define exports */
#[no_mangle]
pub extern fn alloc_image_data(w: u32, h: u32) -> *mut u32 {
    let cap = w as usize * h as usize;
    let mut buf: Vec<u32> = Vec::with_capacity(cap);
    let ptr = buf.as_mut_ptr();
    mem::forget(buf);
    return ptr;
}

#[no_mangle]
pub extern fn dispose_memory(ptr: *mut c_void, cap: usize) {
    unsafe  {
        let _ = Vec::from_raw_parts(ptr, 0, cap);
    }
}

#[no_mangle]
pub extern fn zoom_at(w: u32,
                      h: u32,
                      x0: f64,
                      y0: f64,
                      dx: f64,
                      dy: f64,
                      x: u32,
                      y: u32,
                      mag: f64) {
    let mut frac = Fractal::new(w, h, x0, y0, dx, dy);
    frac.zoom_at(x, y, mag);
    let (x0, y0) = frac.view_coords();
    let dx = frac.res_width();
    let dy = frac.res_height();
    unsafe { zoom_result(x0, y0, dx, dy); }
}

#[no_mangle]
pub extern fn fractx(ptr: *mut u32,
                     w: u32,
                     h: u32,
                     x0: f64,
                     y0: f64,
                     dx: f64,
                     dy: f64,
                     iters: u32) {
    let frac = Fractal::new(w, h, x0, y0, dx, dy);
    let mut buf: Vec<u32> = unsafe {
        let cap = w as usize * h as usize;
        Vec::from_raw_parts(ptr, cap, cap)
    };
    Buffer::write_img_buffer(&frac, iters, false, &mut buf);
    mem::forget(buf);
}
