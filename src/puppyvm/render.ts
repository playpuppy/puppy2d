// The following code comes from matter.js
// 
// Copyright(c) Liam Brummitt and contributors.
// The MIT License (MIT)
// 
// Porting to TypeScript by Kimio Kuramitsu 

import { Common, Events } from '../matter-ts/commons';
import { Vector, Bounds } from '../matter-ts/geometry';
import { Body, Constraint, World } from '../matter-ts/body';
import { Pair, Grid } from '../matter-ts/collision';

/**
 * Description
 * @method _createCanvas
 * @private
 * @param {} width
 * @param {} height
 * @return canvas
 */

const createCanvas = (element: HTMLElement, width: number, height: number) => {
  var canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.oncontextmenu = () => false;
  canvas.onselectstart = () => false;
  element.appendChild(canvas);
  return canvas;
}

/**
 * Gets the pixel ratio of the canvas.
 * @method _getPixelRatio
 * @private
 * @param {HTMLElement} canvas
 * @return {Number} pixel ratio
 */

const _getPixelRatio = (canvas: HTMLCanvasElement) => {
  const context = canvas.getContext('2d') as any;
  const devicePixelRatio = window.devicePixelRatio || 1;
  const backingStorePixelRatio = context.webkitBackingStorePixelRatio || context.mozBackingStorePixelRatio
    || context.msBackingStorePixelRatio || context.oBackingStorePixelRatio
    || context.backingStorePixelRatio || 1;
  return devicePixelRatio / backingStorePixelRatio;
};

/**
 * Gets the requested texture (an Image) via its path
 * @method _getTexture
 * @private
 * @param {render} render
 * @param {string} imagePath
 * @return {Image} texture
 */

const NoImage = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Layer_1" x="0px" y="0px" viewBox="0 0 100 100" enable-background="new 0 0 100 100" xml:space="preserve" height="100px" width="100px">
<g>
    <path d="M28.1,36.6c4.6,1.9,12.2,1.6,20.9,1.1c8.9-0.4,19-0.9,28.9,0.9c6.3,1.2,11.9,3.1,16.8,6c-1.5-12.2-7.9-23.7-18.6-31.3   c-4.9-0.2-9.9,0.3-14.8,1.4C47.8,17.9,36.2,25.6,28.1,36.6z"/>
    <path d="M70.3,9.8C57.5,3.4,42.8,3.6,30.5,9.5c-3,6-8.4,19.6-5.3,24.9c8.6-11.7,20.9-19.8,35.2-23.1C63.7,10.5,67,10,70.3,9.8z"/>
    <path d="M16.5,51.3c0.6-1.7,1.2-3.4,2-5.1c-3.8-3.4-7.5-7-11-10.8c-2.1,6.1-2.8,12.5-2.3,18.7C9.6,51.1,13.4,50.2,16.5,51.3z"/>
    <path d="M9,31.6c3.5,3.9,7.2,7.6,11.1,11.1c0.8-1.6,1.7-3.1,2.6-4.6c0.1-0.2,0.3-0.4,0.4-0.6c-2.9-3.3-3.1-9.2-0.6-17.6   c0.8-2.7,1.8-5.3,2.7-7.4c-5.2,3.4-9.8,8-13.3,13.7C10.8,27.9,9.8,29.7,9,31.6z"/>
    <path d="M15.4,54.7c-2.6-1-6.1,0.7-9.7,3.4c1.2,6.6,3.9,13,8,18.5C13,69.3,13.5,61.8,15.4,54.7z"/>
    <path d="M39.8,57.6C54.3,66.7,70,73,86.5,76.4c0.6-0.8,1.1-1.6,1.7-2.5c4.8-7.7,7-16.3,6.8-24.8c-13.8-9.3-31.3-8.4-45.8-7.7   c-9.5,0.5-17.8,0.9-23.2-1.7c-0.1,0.1-0.2,0.3-0.3,0.4c-1,1.7-2,3.4-2.9,5.1C28.2,49.7,33.8,53.9,39.8,57.6z"/>
    <path d="M26.2,88.2c3.3,2,6.7,3.6,10.2,4.7c-3.5-6.2-6.3-12.6-8.8-18.5c-3.1-7.2-5.8-13.5-9-17.2c-1.9,8-2,16.4-0.3,24.7   C20.6,84.2,23.2,86.3,26.2,88.2z"/>
    <path d="M30.9,73c2.9,6.8,6.1,14.4,10.5,21.2c15.6,3,32-2.3,42.6-14.6C67.7,76,52.2,69.6,37.9,60.7C32,57,26.5,53,21.3,48.6   c-0.6,1.5-1.2,3-1.7,4.6C24.1,57.1,27.3,64.5,30.9,73z"/>
</g>
</svg>`

const textures: any = {

};

const _getTexture = (imagePath: string, base = '') => {
  const image = textures[imagePath];
  if (image !== undefined) {
    return image;
  }
  const image2 = textures[imagePath] = new Image();
  image2.addEventListener("error", (event: ErrorEvent) => {
    console.log(`no image`);
    image2.src = 'https://hakuhin.jp/graphic/title.png';
  });
  if (
    imagePath.startsWith('http://') ||
    imagePath.startsWith('https://') ||
    imagePath.startsWith('data:') ||
    imagePath.startsWith('/')
  ) {
    image2.src = imagePath;
  } else {
    image2.src = `${base}/${imagePath}`;
  }
  return image;
}

/**
* Gets the mouse position relative to an element given a screen pixel ratio.
* @method _getRelativeMousePosition
* @private
* @param {} event
* @param {} element
* @param {number} pixelRatio
* @return {}
*/

const getMousePosition = (event: any, element: HTMLElement, pixelRatio: number, position: Vector) => {
  const elementBounds = element.getBoundingClientRect();
  const rootNode = (document.documentElement || document.body.parentNode || document.body);
  const scrollX = (window.pageXOffset !== undefined) ? window.pageXOffset : rootNode.scrollLeft;
  const scrollY = (window.pageYOffset !== undefined) ? window.pageYOffset : rootNode.scrollTop;
  const touches = event.changedTouches;
  var x, y;

  if (touches) {
    x = touches[0].pageX - elementBounds.left - scrollX;
    y = touches[0].pageY - elementBounds.top - scrollY;
  } else {
    x = event.pageX - elementBounds.left - scrollX;
    y = event.pageY - elementBounds.top - scrollY;
  }
  position.x =
    x / (element.clientWidth / ((element as any)['width'] || element.clientWidth) * pixelRatio);
  position.y =
    y / (element.clientHeight / ((element as any)['height'] || element.clientHeight) * pixelRatio);
  return position;
}

/**
* The `Matter.Render` module is a simple HTML5 canvas based renderer for visualising instances of `Matter.Engine`.
* It is intended for development and debugging purposes, but may also be suitable for simple games.
* It includes a number of drawing options including wireframe, vector with support for sprites and viewports.
*
* @class Render
*/

const _requestAnimationFrame = window.requestAnimationFrame;
const _cancelAnimationFrame = window.cancelAnimationFrame;

export class PuppyRender {
  public engine: any; // Engine
  public mouse: any; //Mouse;
  private world: World;
  public options: any;
  public canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;//?
  // background: string;
  scale: Vector = new Vector(1, 1);
  offset: Vector = new Vector();
  bounds: Bounds;
  viewports: [number, number, number, number] | null = null;
  frameRequestId = -1;
  pixelRatio = 1;

  /**
   * Creates a new renderer. The options parameter is an object that specifies any properties you wish to override the defaults.
   * All properties have default values, and many are pre-calculated automatically based on other properties.
   * See the properties section below for detailed information on what you can pass via the `options` object.
   * @method create
   * @param {object} [options]
   * @return {render} A new renderer
   */

  public constructor(engine: any, element: HTMLElement) {
    this.engine = engine;
    this.world = engine.world;
    this.options = this.world;
    //this.options.wireframes = true;
    this.canvas = createCanvas(element, element.clientWidth, element.clientHeight);
    //this.mouse = engine.setRender(this);
    this.mouse = engine.getMouse(this);
    this.context = this.canvas.getContext('2d')!;
    // init viewport
    this.bounds = new Bounds(0, 0, this.canvas.width, this.canvas.height);
    if (this.options.screen) {
      this.lookAt(0, 0, this.options.width, this.options.height);
    }
    else {
      const hw = this.options.width / 2;
      const hh = this.options.height / 2;
      this.lookAt(-hw, hh, hw, -hh);
    }
    this.initEvents();
    if (this.options.background) {
      this.applyBackground(this.options.background);
    }
  }

  public clear() {
    if (this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
  }

  // Events 

  private keyDown: any = null;
  private keyUp: any = null;

  private mouseMove: any = null;
  private mouseDown: any = null;
  private mouseUp: any = null;
  private mouseWheel: any = null;

  private initEvents() {
    const mouse = this.mouse;
    var startTime = 0;
    var prevKey = '';
    this.keyDown = (event: KeyboardEvent) => {
      var keyName = event.key;
      if (prevKey !== keyName) {
        prevKey = keyName;
        startTime = this.engine.timing.timestamp;
      }
      this.engine.world.isStillActive = true;
      this.engine.world.fficall('__keydown__', keyName, 0);
    }

    this.keyUp = (event: KeyboardEvent) => {
      var keyName = event.key;
      const endTime = this.engine.timing.timestamp;
      this.engine.world.isStillActive = true;
      this.engine.world.fficall('__keyup__', keyName, Math.max(0, endTime - startTime) | 0);
      prevKey = '';

    }

    this.mouseMove = (event: any) => {
      getMousePosition(event, this.canvas, this.pixelRatio, mouse.absolute);
      const touches = event.changedTouches;

      if (touches) {
        mouse.button = 0;
        event.preventDefault();
      }

      mouse.position.x = mouse.absolute.x * this.scale.x + this.offset.x;
      mouse.position.y = mouse.absolute.y * this.scale.y + this.offset.y;
      mouse.sourceEvents.mousemove = event;
      this.engine.world.isStillActive = true;
      this.engine.world.fficall('__mousemove__', mouse.position.x | 0, mouse.position.y | 0, mouse.button);
    };

    this.mouseDown = (event: any) => {
      getMousePosition(event, this.canvas, this.pixelRatio, mouse.absolute);
      const touches = event.changedTouches;
      if (touches) {
        mouse.button = 0;
        event.preventDefault();
      } else {
        mouse.button = event.button;
      }
      mouse.position.x = mouse.absolute.x * this.scale.x + this.offset.x;
      mouse.position.y = mouse.absolute.y * this.scale.y + this.offset.y;
      mouse.mousedownPosition.x = mouse.position.x;
      mouse.mousedownPosition.y = mouse.position.y;
      mouse.sourceEvents.mousedown = event;
      this.engine.world.isStillActive = true;
      this.engine.world.fficall('__mousedown__', mouse.position.x | 0, mouse.position.y | 0, mouse.button);
    };

    this.mouseUp = (event: any) => {
      getMousePosition(event, this.canvas, this.pixelRatio, mouse.absolute);
      const touches = event.changedTouches;

      if (touches) {
        event.preventDefault();
      }

      mouse.button = -1;
      mouse.position.x = mouse.absolute.x * this.scale.x + this.offset.x;
      mouse.position.y = mouse.absolute.y * this.scale.y + this.offset.y;
      mouse.mouseupPosition.x = mouse.position.x;
      mouse.mouseupPosition.y = mouse.position.y;
      mouse.sourceEvents.mouseup = event;
      this.engine.world.isStillActive = true;
      this.engine.world.fficall('__mouseup__', mouse.position.x | 0, mouse.position.y | 0, mouse.button);
    }

    this.mouseWheel = (event: any) => {
      mouse.wheelDelta = Math.max(-1, Math.min(1, event.wheelDelta || -event.detail));
      //      event.preventDefault();
    };

    // var updateGravity = function (event) {
    //   var orientation = typeof window.orientation !== 'undefined' ? window.orientation : 0,
    //     gravity = engine.world.gravity;

    //   if (orientation === 0) {
    //     gravity.x = Common.clamp(event.gamma, -90, 90) / 90;
    //     gravity.y = Common.clamp(event.beta, -90, 90) / 90;
    //   } else if (orientation === 180) {
    //     gravity.x = Common.clamp(event.gamma, -90, 90) / 90;
    //     gravity.y = Common.clamp(-event.beta, -90, 90) / 90;
    //   } else if (orientation === 90) {
    //     gravity.x = Common.clamp(event.beta, -90, 90) / 90;
    //     gravity.y = Common.clamp(-event.gamma, -90, 90) / 90;
    //   } else if (orientation === -90) {
    //     gravity.x = Common.clamp(-event.beta, -90, 90) / 90;
    //     gravity.y = Common.clamp(event.gamma, -90, 90) / 90;
    //   }
    // };
    // window.addEventListener('deviceorientation', updateGravity);

  }

  private enableInputDevices() {
    if (this.keyDown != null) {
      document.addEventListener('keydown', this.keyDown);
      document.addEventListener('keyup', this.keyUp);

      const element = this.canvas;
      element.addEventListener('mousemove', this.mouseMove);
      element.addEventListener('mousedown', this.mouseDown);
      element.addEventListener('mouseup', this.mouseUp);

      //element.addEventListener('mousewheel', this.mouseWheel);
      // element.addEventListener('DOMMouseScroll', this.mouseWheel);

      element.addEventListener('touchmove', this.mouseMove);
      element.addEventListener('touchstart', this.mouseDown);
      element.addEventListener('touchend', this.mouseUp);
    }
  }

  private disableInputDevices() {
    if (this.keyDown !== null) {
      document.removeEventListener('keydown', this.keyDown);
      document.removeEventListener('keyup', this.keyUp);

      const element = this.canvas;
      element.removeEventListener('mousemove', this.mouseMove);
      element.removeEventListener('mousedown', this.mouseDown);
      element.removeEventListener('mouseup', this.mouseUp);

      // element.removeEventListener('mousewheel', this.mouseWheel);
      // element.addEventListener('DOMMouseScroll', this.mouseWheel);

      element.removeEventListener('touchmove', this.mouseMove);
      element.removeEventListener('touchstart', this.mouseDown);
      element.removeEventListener('touchend', this.mouseUp);
    }
  }

  /**
   * Positions and sizes the viewport around the given object bounds.
   * Objects must have at least one of the following properties:
   * - `object.bounds`
   * - `object.position`
   * - `object.min` and `object.max`
   * - `object.x` and `object.y`
   * @method lookAt
   * @param {render} this
   * @param {object[]} objects
   * @param {vector} [padding]
   * @param {bool} [center=true]
   */

  private lookAt(minX: number, minY: number, maxX: number, maxY: number, center = true) {
    // find ratios
    const viewWidth = (maxX - minX);
    const viewHeight = (maxY - minY);
    const canvasHeight = this.canvas.height;
    const canvasWidth = this.canvas.width;
    const canvasRatio = canvasWidth / canvasHeight;
    const viewRatio = Math.abs(viewWidth / viewHeight);
    var scaleX = 1;
    var scaleY = 1;
    // find scale factor
    if (viewRatio > canvasRatio) {
      scaleY *= viewRatio / canvasRatio;
    } else {
      scaleX *= canvasRatio / viewRatio;
    }

    // position and size
    this.bounds.min.x = minX;
    this.bounds.max.x = minX + viewWidth * scaleX;
    this.bounds.min.y = minY;
    this.bounds.max.y = minY + viewHeight * scaleY;
    //console.log(`${this.bounds.min.x} ${this.bounds.min.y} ${this.bounds.max.x} ${this.bounds.max.y}`)

    // center
    if (center) {
      this.bounds.min.x += viewWidth * 0.5 - (viewWidth * scaleX) * 0.5;
      this.bounds.max.x += viewWidth * 0.5 - (viewWidth * scaleX) * 0.5;
      this.bounds.min.y += viewHeight * 0.5 - (viewHeight * scaleY) * 0.5;
      this.bounds.max.y += viewHeight * 0.5 - (viewHeight * scaleY) * 0.5;
    }

    const mx = (this.bounds.max.x - this.bounds.min.x) / this.canvas.width;
    const my = (this.bounds.max.y - this.bounds.min.y) / this.canvas.height;
    this.scale.x = mx;
    this.scale.y = my;
    this.offset = new Vector(this.bounds.min.x, this.bounds.min.y);
    if (my < 0) {
      this.bounds = new Bounds(this.bounds.min.x, this.bounds.max.y, this.bounds.max.x, this.bounds.min.y);
    }
    // update mouse
    if (this.mouse) {
      //console.log(`BOUND ${this.bounds.min.x} ${this.bounds.min.y} ${this.bounds.max.x} ${this.bounds.max.y}`)
      this.mouse.setScale(this.scale);
      this.mouse.setOffset(this.offset);
    }
    this.viewports = [minX, minY, maxX, maxY];
  }

  public isComputerScreen() {
    return this.scale.y > 0;
  }

  private yscale(y: number) {
    return this.scale.y > 0 ? y : -y;
  }

  public setViewport(x1: number, y1: number, x2: number, y2: number, center = true) {
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const maxX = Math.max(x1, x2);
    const maxY = Math.max(y1, y2);
    if (this.isComputerScreen()) {
      this.lookAt(minX, minY, maxX, maxY, center);
    }
    else {
      this.lookAt(minX, maxY, maxX, minY, center);
    }
  }

  public resize(width: number, height: number) {
    const canvas = this.canvas;
    canvas.width = width;
    canvas.height = height;
    if (this.viewports) {
      this.lookAt(this.viewports[0], this.viewports[1], this.viewports[2], this.viewports[3], true);
    }
  }

  public measureWidth(text: string, font?: string) {
    if (font) {
      const defaultFont = this.context.font;
      this.context.font = font;
      const m = this.context.measureText(text);
      this.context.font = defaultFont;
      return m.width;
    }
    else {
      const m = this.context.measureText(text);
      return m.width;
    }
  }

  showingMessage: string | null = null;

  public show(message: string, time = 1000) {
    this.showingMessage = message;
    if (this.showingMessage !== null) {
      setTimeout(() => { this.showingMessage = null }, time);
    }
  }

  /**
   * Continuously updates the render canvas on the `requestAnimationFrame` event.
   * @method run
   * @param {render} this
   */

  public start(message?: string) {
    this.enableInputDevices();
    if (message !== undefined) {
      this.show(message);
    }
    this.canvas.style.filter = '';
    if (_requestAnimationFrame !== undefined) {
      const loop = (time: number) => {
        this.frameRequestId = _requestAnimationFrame(loop);
        this.draw();
      };
      loop(1);//
    }
  }

  /**
   * Ends execution of `Render.run` on the given `render`, by canceling the animation frame request event loop.
   * @method stop
   * @param {render} render
   */

  public stop(message?: string) {
    this.disableInputDevices();
    if (message !== undefined) {
      this.show(message);
      setTimeout(() => {
        _cancelAnimationFrame(this.frameRequestId);
        this.canvas.style.filter = 'grayscale(100%)';
      }, 100);
    }
    else {
      if (_cancelAnimationFrame !== undefined) {
        _cancelAnimationFrame(this.frameRequestId);
      }
    }
  }

  /**
   * Sets the pixel ratio of the renderer and updates the canvas.
   * To automatically detect the correct ratio, pass the string `'auto'` for `pixelRatio`.
   * @method setPixelRatio
   * @param {render} this
   * @param {number} pixelRatio
   */

  private setPixelRatio(pixelRatio?: number) {
    //   var options = this.world;
    //   var canvas = this.canvas;

    //   if (pixelRatio === undefined) {
    //     pixelRatio = _getPixelRatio(canvas);
    //   }

    //   options.pixelRatio = pixelRatio;
    //   canvas.setAttribute('data-pixel-ratio', `${pixelRatio}`);
    //   canvas.width = options.width * pixelRatio;
    //   canvas.height = options.height * pixelRatio;
    //   canvas.style.width = options.width + 'px';
    //   canvas.style.height = options.height + 'px';
    // 
  }

  /**
   * Applies viewport transforms based on `render.bounds` to a render context.
   * @method startViewTransform
   * @param {render} this
   */

  private startViewTransform() {
    this.context.save();
    this.context.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.context.scale(this.pixelRatio / this.scale.x, this.pixelRatio / this.scale.y);
  }

  /**
   * Resets all transforms on the render context.
   * @method endViewTransform
   * @param {render} render
   */

  private endViewTransform() {
    this.context.restore();
  }

  /**
   * Renders the given `engine`'s `Matter.World` object.
   * This is the entry point for all rendering and should be called every time the scene changes.
   * @method world
   * @param {render} this
   */

  //private globalAlpha = 0.9;
  private ticks = 0;

  public draw() {
    const engine = this.engine;
    const world = engine.world;
    const canvas = this.canvas;
    const context = this.context;
    const options = world as any;
    const allBodies = world.allBodies();
    const allConstraints = world.allConstraints();
    const background = options.wireframes ? 'rgba(230,230,230,0.5)' : world.background;
    const timestamp = engine.timing.timestamp;

    var bodies: Body[] = [];
    var constraints: Constraint[] = [];
    const bodies0: Body[] = world.allBodies0();
    const bodiesZ: Body[] = world.allBodiesZ();

    var event = {
      timestamp: timestamp
    }
    world.vars['TIMESTAMP'] = timestamp;
    world.vars['TIME'] = ((timestamp / 1000) | 0);
    world.vars['MOUSE'] = engine.mouse.position;
    world.vars['VIEWPORT'] = this.bounds;

    Events.trigger(this, 'beforeRender', event);

    // apply background if it has changed

    // clear the canvas with a transparent fill, 
    // to allow the canvas background to show
    context.globalCompositeOperation = 'source-in';
    context.fillStyle = "transparent";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = 'source-over';

    // filter out bodies that are not in view
    for (var i = 0; i < allBodies.length; i++) {
      var body = allBodies[i];
      if (Bounds.overlaps(body.bounds, this.bounds))
        bodies.push(body);
    }

    // filter out constraints that are not in view
    for (var i = 0; i < allConstraints.length; i++) {
      var constraint = allConstraints[i],
        bodyA = constraint.bodyA,
        bodyB = constraint.bodyB,
        pointAWorld = constraint.pointA,
        pointBWorld = constraint.pointB;

      if (bodyA) pointAWorld = Vector.add(bodyA.position, constraint.pointA!);
      if (bodyB) pointBWorld = Vector.add(bodyB.position, constraint.pointB!);

      if (!pointAWorld || !pointBWorld)
        continue;

      if (Bounds.contains(this.bounds, pointAWorld) || Bounds.contains(this.bounds, pointBWorld))
        constraints.push(constraint);
    }

    // transform the view
    this.startViewTransform();

    if (!options.wireframes) {
      // fully featured rendering of bodies
      this.bodies(bodies0, context);
      this.bodies(bodies, context);
    } else {
      // optimised method for wireframes only
      this.bodyWireframes(bodies, context);
      this.bodyBounds(bodies, context);
      this.bodyAxes(bodies, context);
      this.bodyPositions(bodies, context);
      this.bodyVelocity(bodies, context);
      this.collisions(engine.pairs.list, context);
      this.grid(engine.broadphase, context);
    }
    this.constraints(constraints, context);
    this.bodies(bodiesZ, context);

    this.endViewTransform();
    this.ticks += 1;
    this.world.fficall('__motion__', this.ticks);

    if (this.showingMessage !== null) {
      context.font = 'bold 80px sans-serif';
      const w = context.measureText(this.showingMessage).width;
      const cx = this.canvas.width / 2;
      const cy = this.canvas.height / 2;
      context.fillStyle = 'rgba(0,0,0,0.75)';
      context.fillRect(cx - w, cy - w, w + w, w + w);
      context.fillStyle = 'white';
      context.textAlign = 'center';
      context.fillText(this.showingMessage, cx, cy + 40);
    }

    Events.trigger(this, 'afterRender', event);
    //console.log(world.isModified);
  }

  /**
  * Applies the background to the canvas using CSS.
  * @method applyBackground
  * @private
  * @param {render} render
  * @param {string} background
  */

  public applyBackground(background: string) {
    var cssBackground = background;
    if (/(jpg|gif|png)$/.test(background)) {
      cssBackground = `url(${background})`;
    }
    this.canvas.style.background = cssBackground;
    this.canvas.style.backgroundSize = "contain";
  }

  /**
   * Description
   * @private
   * @method constraints
   * @param {constraint[]} constraints
   * @param {RenderingContext} context
   */

  private constraints(constraints: Constraint[], context: CanvasRenderingContext2D) {
    const c = context;

    for (var i = 0; i < constraints.length; i++) {
      const constraint = constraints[i];

      if (!constraint.visible || !constraint.pointA || !constraint.pointB)
        continue;

      const bodyA = constraint.bodyA;
      const bodyB = constraint.bodyB;
      const start = (bodyA) ? Vector.add(bodyA.position, constraint.pointA) : constraint.pointA;


      if (constraint.renderType === 'pin') {
        c.beginPath();
        c.arc(start.x, start.y, 3, 0, 2 * Math.PI);
        c.closePath();
      } else {
        const end = (bodyB) ? Vector.add(bodyB.position, constraint.pointB) : constraint.pointB;

        c.beginPath();
        c.moveTo(start.x, start.y);

        if (constraint.renderType === 'spring') {
          var delta = Vector.sub(end, start),
            normal = Vector.perp(Vector.normalise(delta)),
            coils = Math.ceil(Common.clamp(constraint.length / 5, 12, 20)),
            offset;

          for (var j = 1; j < coils; j += 1) {
            offset = j % 2 === 0 ? 1 : -1;

            c.lineTo(
              start.x + delta.x * (j / coils) + normal.x * offset * 4,
              start.y + delta.y * (j / coils) + normal.y * offset * 4
            );
          }
        }

        c.lineTo(end.x, end.y);
        //console.log(`c ${start.x},${start.y} ${end.x},${end.y}`)
      }

      if (constraint.lineWidth) {
        c.lineWidth = constraint.lineWidth;
        c.strokeStyle = 'gray'; //constraint.strokeStyle;
        c.stroke();
      }

      // if (constraint.anchors) {
      //   c.fillStyle = constraint.strokeStyle;
      //   c.beginPath();
      //   c.arc(start.x, start.y, 3, 0, 2 * Math.PI);
      //   c.arc(end.x, end.y, 3, 0, 2 * Math.PI);
      //   c.closePath();
      //   c.fill();
      // }
    }
  }

  // /**
  //  * Description
  //  * @private
  //  * @method bodyShadows
  //  * @param {render} render
  //  * @param {body[]} bodies
  //  * @param {RenderingContext} context
  //  */

  // private bodyShadows(bodies: Body[], context: CanvasRenderingContext2D) {
  //   var c = context,
  //     engine = this.engine;

  //   for (var i = 0; i < bodies.length; i++) {
  //     var body = bodies[i];

  //     if (!body.visible)
  //       continue;

  //     if (body.circleRadius) {
  //       c.beginPath();
  //       c.arc(body.position.x, body.position.y, body.circleRadius, 0, 2 * Math.PI);
  //       c.closePath();
  //     } else {
  //       c.beginPath();
  //       c.moveTo(body.vertices[0].x, body.vertices[0].y);
  //       for (var j = 1; j < body.vertices.length; j++) {
  //         c.lineTo(body.vertices[j].x, body.vertices[j].y);
  //       }
  //       c.closePath();
  //     }

  //     var distanceX = body.position.x - this.options.width * 0.5,
  //       distanceY = body.position.y - this.options.height * 0.2,
  //       distance = Math.abs(distanceX) + Math.abs(distanceY);

  //     c.shadowColor = 'rgba(0,0,0,0.15)';
  //     c.shadowOffsetX = 0.05 * distanceX;
  //     c.shadowOffsetY = 0.05 * distanceY;
  //     c.shadowBlur = 1 + 12 * Math.min(1, distance / 1000);

  //     c.fill();

  //     // FIXME
  //     // c.shadowColor = null;
  //     // c.shadowOffsetX = null;
  //     // c.shadowOffsetY = null;
  //     // c.shadowBlur = null;
  //   }
  // }

  /**
   * Description
   * @private
   * @method bodies
   * @param {render} render
   * @param {body[]} bodies
   * @param {RenderingContext} context
   */

  private bodies(bodies: Body[], context: CanvasRenderingContext2D) {
    const c = context;
    const options = this.world as any;
    //const showInternalEdges = options.showInternalEdges || !options.wireframes;
    const wireframes = options.wireframes;
    const globalAlpha = options.opacity || 1;
    const defaultFont = options.font || "36px Arial";
    const defaultFontColor = options.fontColor || 'gray';
    const basePath = options.base || 'https://playpuppy.github.io/LIVE2019/image';

    for (var i = 0; i < bodies.length; i++) {
      const body = bodies[i];

      if (!body.visible)
        continue;

      // handle compound parts
      for (var k = body.parts.length > 1 ? 1 : 0; k < body.parts.length; k++) {
        var part: any = body.parts[k];

        if (!part.visible)
          continue;

        // if (options.showSleeping && body.isSleeping) {
        //   c.globalAlpha = 0.5 * part.opacity;
        // } else 
        c.globalAlpha = globalAlpha;
        if (part.opacity !== 1) {
          c.globalAlpha *= part.opacity;
        }
        if (part.texture && !wireframes) {
          const texture = _getTexture(part.texture, basePath);

          c.translate(part.position.x, part.position.y);
          if (this.scale.y < 0) {
            c.rotate(Math.PI + part.angle);
            //c.scale(-1, 1);
          }
          else {
            c.rotate(part.angle);
          }
          try {
            c.drawImage(
              texture,
              part.width * -part.xOffset * part.xScale,
              part.height * -part.yOffset * part.yScale,
              part.width * part.xScale,
              part.height * part.yScale
            );
          }
          catch (e) {

          }
          // revert translation, hopefully faster than save / restore
          if (this.scale.y < 0) {
            c.rotate(-Math.PI - part.angle);
            //c.scale(1, 1);
          }
          else {
            c.rotate(part.angle);
          }
          c.translate(-part.position.x, -part.position.y);
        } else {
          // part polygon
          if (part.circleRadius) {
            c.beginPath();
            c.arc(part.position.x, part.position.y, part.circleRadius, 0, 2 * Math.PI);
          } else {
            c.beginPath();
            c.moveTo(part.vertices[0].x, part.vertices[0].y);

            for (var j = 1; j < part.vertices.length; j++) {
              if (!part.vertices[j - 1].isInternal /* || showInternalEdges */) {
                c.lineTo(part.vertices[j].x, part.vertices[j].y);
              } else {
                c.moveTo(part.vertices[j].x, part.vertices[j].y);
              }

              if (part.vertices[j].isInternal /* && !showInternalEdges*/) {
                c.moveTo(part.vertices[(j + 1) % part.vertices.length].x, part.vertices[(j + 1) % part.vertices.length].y);
              }
            }
            c.lineTo(part.vertices[0].x, part.vertices[0].y);
            c.closePath();
          }
          if (wireframes) {
            c.lineWidth = 1;
            c.strokeStyle = '#bbb';
            c.stroke();
          }
          else {
            c.fillStyle = part.fillStyle;
            if (part.lineWidth) {
              c.lineWidth = part.lineWidth;
              c.strokeStyle = part.strokeStyle;
              c.stroke();
            }
            c.fill();
          }
        }
        c.globalAlpha = globalAlpha;
      }

      // text, 
      const ticker: any = body;
      if (ticker.textRef !== undefined) {
        const text: string = ticker.textRef(body);
        const cx = body.position.x;
        const cy = body.position.y;
        c.save();
        c.globalAlpha = 1;
        c.font = ticker.font || defaultFont;
        c.fillStyle = ticker.fontColor || defaultFontColor;
        c.translate(cx, cy);
        if (this.scale.y < 0) {
          c.rotate(Math.PI);
          c.scale(-1, 1);
        }
        if (ticker.caption) {
          const width = ticker.width;
          const height = ticker.height;
          if (height > 79) {
            c.textAlign = 'center';
            //c.fillStyle = '#666666';
            c.fillText(ticker.caption, 0, -20, width * 0.45);
            //c.fillStyle = ticker.fontColor || defaultFontColor;
            c.textAlign = 'center';
            c.fillText(text, 0, +20, width * 0.90);
          }
          else {
            c.textAlign = 'left';
            c.fillText(ticker.caption, - width / 2, 0, width * 0.45);
            c.textAlign = 'right';
            c.fillText(text, width / 2, 0, width * 0.50);
          }
        }
        else {
          const width = ticker.width || 100;
          c.textAlign = ticker.textAlign || 'center';
          // c.fillStyle = '#000000';
          // c.fillText(text, -2, -2, width);
          c.fillText(text, 0, 0, width * 0.95);
        }
        //c.rotate(-Math.PI);
        //c.translate(-cx, -cy);
        c.restore();
      }
      // quick anime
      ticker.doMotion();
    }
  }

  /**
   * Optimised method for drawing body wireframes in one pass
   * @private
   * @method bodyWireframes
   * @param {render} this
   * @param {body[]} bodies
   * @param {RenderingContext} context
   */

  private bodyWireframes(bodies: Body[], context: CanvasRenderingContext2D) {
    var c = context,
      showInternalEdges = this.options.showInternalEdges,
      body,
      part,
      i,
      j,
      k;

    c.beginPath();

    // render all bodies
    for (i = 0; i < bodies.length; i++) {
      body = bodies[i];

      if (!body.visible)
        continue;

      // handle compound parts
      for (k = body.parts.length > 1 ? 1 : 0; k < body.parts.length; k++) {
        part = body.parts[k];

        c.moveTo(part.vertices[0].x, part.vertices[0].y);

        for (j = 1; j < part.vertices.length; j++) {
          if (!part.vertices[j - 1].isInternal || showInternalEdges) {
            c.lineTo(part.vertices[j].x, part.vertices[j].y);
          } else {
            c.moveTo(part.vertices[j].x, part.vertices[j].y);
          }

          if (part.vertices[j].isInternal && !showInternalEdges) {
            c.moveTo(part.vertices[(j + 1) % part.vertices.length].x, part.vertices[(j + 1) % part.vertices.length].y);
          }
        }

        c.lineTo(part.vertices[0].x, part.vertices[0].y);
      }
    }

    c.lineWidth = 1;
    c.strokeStyle = '#bbb';
    c.stroke();
  };

  /**
   * Optimised method for drawing body convex hull wireframes in one pass
   * @private
   * @method bodyConvexHulls
   * @param {render} this
   * @param {body[]} bodies
   * @param {RenderingContext} context
   */

  private bodyConvexHulls(bodies: Body[], context: CanvasRenderingContext2D) {
    var c = context,
      body,
      part,
      i,
      j,
      k;

    c.beginPath();

    // render convex hulls
    for (i = 0; i < bodies.length; i++) {
      body = bodies[i];

      if (!body.visible || body.parts.length === 1)
        continue;

      c.moveTo(body.vertices[0].x, body.vertices[0].y);

      for (j = 1; j < body.vertices.length; j++) {
        c.lineTo(body.vertices[j].x, body.vertices[j].y);
      }

      c.lineTo(body.vertices[0].x, body.vertices[0].y);
    }

    c.lineWidth = 1;
    c.strokeStyle = 'rgba(255,255,255,0.2)';
    c.stroke();
  };

  /**
   * Renders body vertex numbers.
   * @private
   * @method vertexNumbers
   * @param {render} render
   * @param {body[]} bodies
   * @param {RenderingContext} context
   */
  private vertexNumbers(bodies: Body[], context: CanvasRenderingContext2D) {
    var c = context,
      i,
      j,
      k;

    for (i = 0; i < bodies.length; i++) {
      var parts = bodies[i].parts;
      for (k = parts.length > 1 ? 1 : 0; k < parts.length; k++) {
        var part = parts[k];
        for (j = 0; j < part.vertices.length; j++) {
          c.fillStyle = 'rgba(255,255,255,0.2)';
          c.fillText(i + '_' + j, part.position.x + (part.vertices[j].x - part.position.x) * 0.8, part.position.y + (part.vertices[j].y - part.position.y) * 0.8);
        }
      }
    }
  }

  /**
   * Renders mouse position.
   * @private
   * @method mousePosition
   * @param {render} render
   * @param {mouse} mouse
   * @param {RenderingContext} context
   */
  private mousePosition(mouse: any, context: CanvasRenderingContext2D) {
    var c = context;
    c.fillStyle = 'rgba(255,255,255,0.8)';
    c.fillText(mouse.position.x + '  ' + mouse.position.y, mouse.position.x + 5, mouse.position.y - 5);
  };

  /**
   * Draws body bounds
   * @private
   * @method bodyBounds
   * @param {render} render
   * @param {body[]} bodies
   * @param {RenderingContext} context
   */

  private bodyBounds(bodies: Body[], context: CanvasRenderingContext2D) {
    var c = context,
      engine = this.engine,
      options = this.options;

    c.beginPath();

    for (var i = 0; i < bodies.length; i++) {
      var body = bodies[i];

      if (body.visible) {
        var parts = bodies[i].parts;
        for (var j = parts.length > 1 ? 1 : 0; j < parts.length; j++) {
          var part = parts[j];
          c.rect(part.bounds.min.x, part.bounds.min.y, part.bounds.max.x - part.bounds.min.x, part.bounds.max.y - part.bounds.min.y);
        }
      }
    }

    if (options.wireframes) {
      c.strokeStyle = 'rgba(255,255,255,0.08)';
    } else {
      c.strokeStyle = 'rgba(0,0,0,0.1)';
    }

    c.lineWidth = 1;
    c.stroke();
  }

  /**
   * Draws body angle indicators and axes
   * @private
   * @method bodyAxes
   * @param {render} render
   * @param {body[]} bodies
   * @param {RenderingContext} context
   */

  private bodyAxes(bodies: Body[], context: CanvasRenderingContext2D) {
    var c = context,
      options = this.options,
      part,
      i,
      j,
      k;

    c.beginPath();

    for (i = 0; i < bodies.length; i++) {
      var body = bodies[i],
        parts = body.parts;

      if (!body.visible)
        continue;

      if (options.showAxes) {
        // render all axes
        for (j = parts.length > 1 ? 1 : 0; j < parts.length; j++) {
          part = parts[j];
          for (k = 0; k < part.axes.length; k++) {
            var axis = part.axes[k];
            c.moveTo(part.position.x, part.position.y);
            c.lineTo(part.position.x + axis.x * 20, part.position.y + axis.y * 20);
          }
        }
      } else {
        for (j = parts.length > 1 ? 1 : 0; j < parts.length; j++) {
          part = parts[j];
          for (k = 0; k < part.axes.length; k++) {
            // render a single axis indicator
            c.moveTo(part.position.x, part.position.y);
            c.lineTo((part.vertices[0].x + part.vertices[part.vertices.length - 1].x) / 2,
              (part.vertices[0].y + part.vertices[part.vertices.length - 1].y) / 2);
          }
        }
      }
    }

    // if (options.wireframes) {
    c.strokeStyle = 'indianred';
    c.lineWidth = 1;
    // } else {
    //   c.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    //   c.globalCompositeOperation = 'overlay';
    //   c.lineWidth = 2;
    // }

    c.stroke();
    // c.globalCompositeOperation = 'source-over';
  }

  /**
   * Draws body positions
   * @private
   * @method bodyPositions
   * @param {render} render
   * @param {body[]} bodies
   * @param {RenderingContext} context
   */

  private bodyPositions(bodies: Body[], context: CanvasRenderingContext2D) {
    var c = context;

    c.beginPath();

    // render current positions
    for (var i = 0; i < bodies.length; i++) {
      const body = bodies[i];
      if (!body.visible)
        continue;

      // handle compound parts
      for (var k = 0; k < body.parts.length; k++) {
        const part = body.parts[k];
        c.arc(part.position.x, part.position.y, 10, 0, 2 * Math.PI, false);
        c.closePath();
      }
    }

    c.fillStyle = 'indianred';
    c.fill();

    c.beginPath();

    // render previous positions
    for (var i = 0; i < bodies.length; i++) {
      const body = bodies[i];
      if (body.visible) {
        c.arc(body.positionPrev.x, body.positionPrev.y, 5, 0, 2 * Math.PI, false);
        c.closePath();
      }
    }

    c.fillStyle = 'blue';
    c.fill();
  }

  /**
   * Draws body velocity
   * @private
   * @method bodyVelocity
   * @param {render} this
   * @param {body[]} bodies
   * @param {RenderingContext} context
   */

  private bodyVelocity(bodies: Body[], context: CanvasRenderingContext2D) {
    const c = context;
    c.beginPath();
    for (var i = 0; i < bodies.length; i++) {
      var body = bodies[i];
      if (!body.visible)
        continue;
      c.moveTo(body.position.x, body.position.y);
      c.lineTo(body.position.x + (body.position.x - body.positionPrev.x) * 2, body.position.y + (body.position.y - body.positionPrev.y) * 2);
    }

    c.lineWidth = 8;
    c.strokeStyle = 'cornflowerblue';
    c.stroke();
  }

  /**
   * Draws body ids
   * @private
   * @method bodyIds
   * @param {render} this
   * @param {body[]} bodies
   * @param {RenderingContext} context
   */

  private bodyIds(bodies: Body[], context: CanvasRenderingContext2D) {
    var c = context,
      i,
      j;

    for (i = 0; i < bodies.length; i++) {
      if (!bodies[i].visible)
        continue;

      var parts = bodies[i].parts;
      for (j = parts.length > 1 ? 1 : 0; j < parts.length; j++) {
        var part = parts[j];
        c.font = "12px Arial";
        c.fillStyle = 'rgba(255,255,255,0.5)';
        c.fillText(`${part.id}`, part.position.x + 10, part.position.y - 10);
      }
    }
  }

  /**
   * Description
   * @private
   * @method collisions
   * @param {render} render
   * @param {pair[]} pairs
   * @param {RenderingContext} context
   */

  private collisions(pairs: Pair[], context: CanvasRenderingContext2D) {
    var c = context,
      options = this.options,
      corrected,
      bodyA,
      bodyB;
    const fillStyle = 'orange';
    // if (options.wireframes) {
    //   c.fillStyle = 'rgba(255,255,255,0.7)';
    // } else {
    //   c.fillStyle = 'orange';
    // }
    const world = this.world;

    c.beginPath();

    // render collision positions
    for (var i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      if (!pair.isActive)
        continue;
      for (var j = 0; j < pair.activeContacts.length; j++) {
        const vertex = pair.activeContacts[j].vertex;
        //c.rect(vertex.x - 1.5, vertex.y - 1.5, 3.5, 3.5);
        c.rect(vertex.x - 4, vertex.y - this.yscale(4), 9, 9);
      }
    }

    c.fillStyle = fillStyle;
    c.fill();

    // c.beginPath();

    // // render collision normals
    // for (var i = 0; i < pairs.length; i++) {
    //   const pair = pairs[i];

    //   if (!pair.isActive)
    //     continue;

    //   const collision = pair.collision!;

    //   if (pair.activeContacts.length > 0) {
    //     var normalPosX = pair.activeContacts[0].vertex.x,
    //       normalPosY = pair.activeContacts[0].vertex.y;

    //     if (pair.activeContacts.length === 2) {
    //       normalPosX = (pair.activeContacts[0].vertex.x + pair.activeContacts[1].vertex.x) / 2;
    //       normalPosY = (pair.activeContacts[0].vertex.y + pair.activeContacts[1].vertex.y) / 2;
    //     }

    //     if (collision.bodyB === collision.supports[0].body || collision.bodyA.isStatic === true) {
    //       c.moveTo(normalPosX - collision.normal.x * 8, normalPosY - collision.normal.y * 8);
    //     } else {
    //       c.moveTo(normalPosX + collision.normal.x * 8, normalPosY + collision.normal.y * 8);
    //     }

    //     c.lineTo(normalPosX, normalPosY);
    //   }
    // }
    // c.fillStyle = fillStyle;
    // c.lineWidth = 5;
    // c.stroke();
  }

  /**
   * Description
   * @private
   * @method separations
   * @param {render} render
   * @param {pair[]} pairs
   * @param {RenderingContext} context
   */
  private separations(pairs: Pair[], context: CanvasRenderingContext2D) {
    var c = context,
      options = this.options,
      pair,
      collision,
      corrected,
      bodyA,
      bodyB,
      i,
      j;

    c.beginPath();

    // render separations
    for (i = 0; i < pairs.length; i++) {
      pair = pairs[i];

      if (!pair.isActive)
        continue;

      collision = pair.collision!;
      bodyA = collision.bodyA;
      bodyB = collision.bodyB;

      var k = 1;

      if (!bodyB.isStatic && !bodyA.isStatic) k = 0.5;
      if (bodyB.isStatic) k = 0;

      c.moveTo(bodyB.position.x, bodyB.position.y);
      c.lineTo(bodyB.position.x - collision.penetration.x * k, bodyB.position.y - collision.penetration.y * k);

      k = 1;

      if (!bodyB.isStatic && !bodyA.isStatic) k = 0.5;
      if (bodyA.isStatic) k = 0;

      c.moveTo(bodyA.position.x, bodyA.position.y);
      c.lineTo(bodyA.position.x + collision.penetration.x * k, bodyA.position.y + collision.penetration.y * k);
    }

    c.strokeStyle = 'black' // 'rgba(255,165,0,0.5)';
    c.stroke();
  }

  /**
   * Description
   * @private
   * @method grid
   * @param {render} this
   * @param {grid} grid
   * @param {RenderingContext} context
   */

  private grid(grid: Grid, context: CanvasRenderingContext2D) {
    const c = context;
    const width = grid.bucketWidth;
    const height = grid.bucketHeight;
    c.strokeStyle = 'black';
    c.beginPath();

    const bucketIds = Object.keys(grid.buckets);

    for (const bucketId of bucketIds) {
      if (grid.buckets[bucketId].length < 1)
        continue;

      var region = bucketId.split(/C|R/);
      c.rect(parseInt(region[1], 10) * width + 0.5,
        parseInt(region[2], 10) * height + 0.5,
        width,
        height);
    }

    c.lineWidth = 1;
    c.stroke();
  }

  /**
   * Description
   * @private
   * @method inspector
   * @param {inspector} inspector
   * @param {RenderingContext} context
   */
  private inspector(inspector: any, context: CanvasRenderingContext2D) {
    var engine = inspector.engine,
      selected = inspector.selected,
      render = inspector.render,
      options = render.options,
      bounds;

    if (options.hasBounds) {
      var boundsWidth = render.bounds.max.x - render.bounds.min.x,
        boundsHeight = render.bounds.max.y - render.bounds.min.y,
        boundsScaleX = boundsWidth / render.options.width,
        boundsScaleY = boundsHeight / render.options.height;

      context.scale(1 / boundsScaleX, 1 / boundsScaleY);
      context.translate(-render.bounds.min.x, -render.bounds.min.y);
    }

    for (var i = 0; i < selected.length; i++) {
      var item = selected[i].data;

      context.translate(0.5, 0.5);
      context.lineWidth = 1;
      context.strokeStyle = 'rgba(255,165,0,0.9)';
      context.setLineDash([1, 2]);

      switch (item.type) {

        case 'body':

          // render body selections
          bounds = item.bounds;
          context.beginPath();
          context.rect(Math.floor(bounds.min.x - 3), Math.floor(bounds.min.y - 3),
            Math.floor(bounds.max.x - bounds.min.x + 6), Math.floor(bounds.max.y - bounds.min.y + 6));
          context.closePath();
          context.stroke();

          break;

        case 'constraint':

          // render constraint selections
          var point = item.pointA;
          if (item.bodyA)
            point = item.pointB;
          context.beginPath();
          context.arc(point.x, point.y, 10, 0, 2 * Math.PI);
          context.closePath();
          context.stroke();

          break;

      }

      context.setLineDash([]);
      context.translate(-0.5, -0.5);
    }

    // render selection region
    if (inspector.selectStart !== null) {
      context.translate(0.5, 0.5);
      context.lineWidth = 1;
      context.strokeStyle = 'rgba(255,165,0,0.6)';
      context.fillStyle = 'rgba(255,165,0,0.1)';
      bounds = inspector.selectBounds;
      context.beginPath();
      context.rect(Math.floor(bounds.min.x), Math.floor(bounds.min.y),
        Math.floor(bounds.max.x - bounds.min.x), Math.floor(bounds.max.y - bounds.min.y));
      context.closePath();
      context.stroke();
      context.fill();
      context.translate(-0.5, -0.5);
    }

    if (options.hasBounds)
      context.setTransform(1, 0, 0, 1, 0, 0);
  }


}