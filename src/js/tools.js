import window from 'global';

export function getElementPosition(element) {
    var left = 0, top = 0;
    if (element.offsetParent) {
        do {
            left += element.offsetLeft;
            top += element.offsetTop;
        } while (element = element.offsetParent);
        return { x: left, y: top };
    }
    return undefined;
}

export function getEventLocation(element, ev) {
    const {x, y} = getElementPosition(element);
    
    return {
        x: (ev.pageX - x),
        y: (ev.pageY - y)
    };
}

export function createCanvas(id, element, width, height) {
  var canvas = window.document.createElement('canvas');
  canvas.id     = id;
  canvas.setAttribute("style", "left:0; top: 0;");
  canvas.width  = width || window.innerWidth;
  canvas.height = height || window.innerHeight;
  element.appendChild(canvas);
  return canvas;
}
