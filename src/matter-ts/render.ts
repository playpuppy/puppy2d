// The following code comes from matter.js
// 
// Copyright(c) Liam Brummitt and contributors.
// The MIT License (MIT)
// 
// Porting to TypeScript by Kimio Kuramitsu 

import { Common, Events } from './commons';
import { Vector, Bounds } from './geometry';
import { Body, Constraint, Composite, World } from './body';
import { Pair, Grid } from './collision';
//import { Mouse } from './mouse';

/**
 * Description
 * @method _createCanvas
 * @private
 * @param {} width
 * @param {} height
 * @return canvas
 */

const createCanvas = (width: number, height: number) => {
  var canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.oncontextmenu = () => false;
  canvas.onselectstart = () => false;
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

const _getTexture = (imagePath: string) => {
  const image = textures[imagePath];
  if (image) {
    return image;
  }
  const image2 = textures[imagePath] = new Image();
  image2.addEventListener("error", (event: ErrorEvent) => {
    image2.src = NoImage;
  });
  if (
    imagePath.startsWith('http://') ||
    imagePath.startsWith('https://') ||
    imagePath.startsWith('data:') ||
    imagePath.startsWith('/')
  ) {
    image2.src = imagePath;
  } else {
    image2.src = `/image/${imagePath}`;
  }
  return image;
}

/**
* The `Matter.Render` module is a simple HTML5 canvas based renderer for visualising instances of `Matter.Engine`.
* It is intended for development and debugging purposes, but may also be suitable for simple games.
* It includes a number of drawing options including wireframe, vector with support for sprites and viewports.
*
* @class Render
*/

//const _requestAnimationFrame: any = undefined;
//const _cancelAnimationFrame: any = undefined;

const _requestAnimationFrame = window.requestAnimationFrame;
const _cancelAnimationFrame = window.cancelAnimationFrame;

// if (typeof window !== 'undefined') {
//   _requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame
//     || window.mozRequestAnimationFrame || window.msRequestAnimationFrame
//     || function (callback) { window.setTimeout(function () { callback(Common.now()); }, 1000 / 60); };

//   _cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame
//     || window.webkitCancelAnimationFrame || window.msCancelAnimationFrame;
// }

export class Render {
  public engine: any; // Engine
  public mouse: any; //Mouse;
  private world: World;
  public canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;//?
  // background: string;
  public scale: Vector = new Vector(1, 1);
  public offset: Vector = new Vector();
  public bounds: Bounds;
  public frameRequestId = -1;
  pixelRatio = 1;

  public options: any = {
    // width: 800,
    // height: 600,
    pixelRatio: 1,
    background: '#18181d',
    wireframeBackground: '#0f0f13',
    //hasBounds: !!options.bounds,
    enabled: true,
    wireframes: false, //
    showSleeping: true,
    showDebug: false,
    showBroadphase: false,
    showBounds: false,
    showVelocity: false,
    showCollisions: false,
    showSeparations: false,
    showAxes: false,
    showPositions: false,
    showAngleIndicator: false,
    showIds: false,
    showShadows: false,
    showVertexNumbers: false,
    showConvexHulls: false,
    showInternalEdges: false,
    showMousePosition: false
  };

  /**
   * Creates a new renderer. The options parameter is an object that specifies any properties you wish to override the defaults.
   * All properties have default values, and many are pre-calculated automatically based on other properties.
   * See the properties section below for detailed information on what you can pass via the `options` object.
   * @method create
   * @param {object} [options]
   * @return {render} A new renderer
   */

  public constructor(engine: any, element: HTMLElement, options: any = {}) {
    this.engine = engine;
    this.world = engine.world;
    //console.log(element);
    this.canvas = createCanvas(element.clientWidth, element.clientHeight);
    // this.canvas.onfocus = () => {
    //   this.globalAlpha = 1.0;
    //   console.log('Focused');
    // }
    // this.canvas.onblur = () => {
    //   this.globalAlpha = 0.8;
    //   console.log('Blurred');
    // }
    element.appendChild(this.canvas);
    this.mouse = engine.setRender(this);
    this.context = this.canvas.getContext('2d')!;
    this.bounds = new Bounds(0, 0, this.canvas.width, this.canvas.height);
    if (this.options.pixelRatio !== 1) {
      this.setPixelRatio(this.options.pixelRatio);
    }
  }

  public clear() {
    if (this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
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

  public run(message?: string) {
    // document.addEventListener('keydown', (event) => {
    //   var keyName = event.key;

    //   if (event.ctrlKey) {
    //     console.log(`keydown:Ctrl + ${keyName}`);
    //   } else if (event.shiftKey) {
    //     console.log(`keydown:Shift + ${keyName}`);
    //   } else {
    //     console.log(`keydown:${keyName}`);
    //   }
    // });
    if (message !== undefined) {
      this.show(message);
    }
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
    if (message !== undefined) {
      this.show(message);
      setTimeout(() => {
        _cancelAnimationFrame(this.frameRequestId);
        //this.canvas.style.filter = 'sepia(50%)';
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
    var options = this.options;
    var canvas = this.canvas;

    if (pixelRatio === undefined) {
      pixelRatio = _getPixelRatio(canvas);
    }

    options.pixelRatio = pixelRatio;
    canvas.setAttribute('data-pixel-ratio', `${pixelRatio}`);
    canvas.width = options.width * pixelRatio;
    canvas.height = options.height * pixelRatio;
    canvas.style.width = options.width + 'px';
    canvas.style.height = options.height + 'px';
  };

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

  public lookAt(bounds: Bounds, padding: Vector = Vector.Null, center = true) {
    // // find bounds of all objects
    // var bounds = new Bounds(Infinity, Infinity, -Infinity, -Infinity);

    // for (var i = 0; i < objects.length; i += 1) {
    //   var object = objects[i],
    //     min = object.bounds ? object.bounds.min : (object.min || object.position || object),
    //     max = object.bounds ? object.bounds.max : (object.max || object.position || object);

    //   if (min && max) {
    //     if (min.x < bounds.min.x)
    //       bounds.min.x = min.x;

    //     if (max.x > bounds.max.x)
    //       bounds.max.x = max.x;

    //     if (min.y < bounds.min.y)
    //       bounds.min.y = min.y;

    //     if (max.y > bounds.max.y)
    //       bounds.max.y = max.y;
    //   }
    // }
    //console.log(bounds);
    //console.log(`${bounds.min.x} ${bounds.min.y} ${bounds.max.x} ${bounds.max.y}`)

    // find ratios
    const viewWidth = (bounds.max.x - bounds.min.x) + 2 * padding.x;
    const viewHeight = (bounds.max.y - bounds.min.y) + 2 * padding.y;
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

    // enable bounds
    this.options.hasBounds = true;

    // position and size
    this.bounds.min.x = bounds.min.x;
    this.bounds.max.x = bounds.min.x + viewWidth * scaleX;
    this.bounds.min.y = bounds.min.y;
    this.bounds.max.y = bounds.min.y + viewHeight * scaleY;
    //console.log(`${this.bounds.min.x} ${this.bounds.min.y} ${this.bounds.max.x} ${this.bounds.max.y}`)

    // center
    if (center) {
      this.bounds.min.x += viewWidth * 0.5 - (viewWidth * scaleX) * 0.5;
      this.bounds.max.x += viewWidth * 0.5 - (viewWidth * scaleX) * 0.5;
      this.bounds.min.y += viewHeight * 0.5 - (viewHeight * scaleY) * 0.5;
      this.bounds.max.y += viewHeight * 0.5 - (viewHeight * scaleY) * 0.5;
    }

    // padding
    this.bounds.min.x -= padding.x;
    this.bounds.max.x -= padding.x;
    this.bounds.min.y -= padding.y;
    this.bounds.max.y -= padding.y;

    const mx = (this.bounds.max.x - this.bounds.min.x) / this.canvas.width;
    const my = (this.bounds.max.y - this.bounds.min.y) / this.canvas.height;
    this.scale = new Vector(mx, my);
    this.offset = this.bounds.min;
    if (my < 0) {
      this.bounds = new Bounds(this.bounds.min.x, this.bounds.max.y, this.bounds.max.x, this.bounds.min.y);
    }
    // update mouse
    if (this.mouse) {
      //console.log(`BOUND ${this.bounds.min.x} ${this.bounds.min.y} ${this.bounds.max.x} ${this.bounds.max.y}`)
      this.mouse.setScale(this.scale);
      this.mouse.setOffset(this.offset);
    }
  }

  /**
   * Applies viewport transforms based on `render.bounds` to a render context.
   * @method startViewTransform
   * @param {render} this
   */

  private startViewTransform() {
    this.context.save();
    this.context.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.context.scale(this.options.pixelRatio / this.scale.x, this.options.pixelRatio / this.scale.y);
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

  private globalAlpha = 0.9;
  private currentBackground = '';

  public draw() {
    const engine = this.engine;
    const world = engine.world;
    const canvas = this.canvas;
    const context = this.context;
    const options = this.options;
    const allBodies = world.allBodies();
    const allConstraints = world.allConstraints();
    const background = options.wireframes ? options.wireframeBackground : world.background;
    const timestamp = engine.timing.timestamp;

    var bodies: Body[] = [];
    var constraints: Constraint[] = [];
    const paints: Body[] = world.allPaints();
    const tickers: Body[] = world.allTickers();

    var event = {
      timestamp: timestamp
    }
    world.timestamp = timestamp;
    world.vars['MOUSE'] = engine.mouse.position;
    world.vars['VIEWPORT'] = this.bounds;

    Events.trigger(this, 'beforeRender', event);

    // apply background if it has changed
    if (this.currentBackground !== background) {
      this.applyBackground(background);
    }

    // clear the canvas with a transparent fill, 
    // to allow the canvas background to show
    context.globalCompositeOperation = 'source-in';
    context.fillStyle = "transparent";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = 'source-over';

    // handle bounds
    if (options.hasBounds) {
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

      // // update mouse
      // if (this.mouse) {
      //   this.mouse.setScale(new Vector(
      //     (this.bounds.max.x - this.bounds.min.x) / this.canvas.width,
      //     (this.bounds.max.y - this.bounds.min.y) / this.canvas.height
      //   ));
      //   this.mouse.setOffset(this.bounds.min);
      // }
    } else {
      constraints = allConstraints;
      bodies = allBodies;

      if (this.options.pixelRatio !== 1) {
        this.context.setTransform(this.options.pixelRatio, 0, 0, this.options.pixelRatio, 0, 0);
      }
    }

    if (!options.wireframes || (engine.enableSleeping && options.showSleeping)) {
      // fully featured rendering of bodies
      this.bodies(paints, context);
      this.bodies(bodies, context);
      this.bodies(tickers, context);
    } else {
      if (options.showConvexHulls)
        this.bodyConvexHulls(bodies, context);

      // optimised method for wireframes only
      this.bodyWireframes(bodies, context);
    }

    if (options.showBounds)
      this.bodyBounds(bodies, context);

    if (options.showAxes || options.showAngleIndicator)
      this.bodyAxes(bodies, context);

    if (options.showPositions)
      this.bodyPositions(bodies, context);

    if (options.showVelocity)
      this.bodyVelocity(bodies, context);

    if (options.showIds)
      this.bodyIds(bodies, context);

    if (options.showSeparations)
      this.separations(engine.pairs.list, context);

    if (options.showCollisions)
      this.collisions(engine.pairs.list, context);

    if (options.showVertexNumbers)
      this.vertexNumbers(bodies, context);

    if (options.showMousePosition)
      this.mousePosition(this.mouse, context);

    Render.constraints(constraints, context);

    if (options.showBroadphase && engine.broadphase instanceof Grid)
      this.grid(engine.broadphase, context);

    if (options.showDebug)
      this.debug(context);

    if (options.hasBounds) {
      // revert view transforms
      this.endViewTransform();
    }
    if (this.showingMessage !== null) {
      context.font = '96px Arial 🎨';
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

  private applyBackground(background: string) {
    var cssBackground = background;
    if (/(jpg|gif|png)$/.test(background))
      cssBackground = 'url(' + background + ')';
    this.canvas.style.background = cssBackground;
    this.canvas.style.backgroundSize = "contain";
    this.currentBackground = background;
  }

  private debugString = '';
  private debugTimestamp = 0;

  /**
   * Description
   * @private
   * @method debug
   * @param {render} this
   * @param {RenderingContext} context
   */
  private debug(context: CanvasRenderingContext2D) {
    var c = context,
      engine = this.engine,
      world = engine.world,
      // metrics = engine.metrics,
      options = this.options,
      bodies = world.allBodies(),
      space = "    ";

    if (engine.timing.timestamp - (this.debugTimestamp) >= 500) {
      var text = "";

      // if (metrics.timing) {
      //   text += "fps: " + Math.round(metrics.timing.fps) + space;
      // }

      // // @if DEBUG
      // if (metrics.extended) {
      //   if (metrics.timing) {
      //     text += "delta: " + metrics.timing.delta.toFixed(3) + space;
      //     text += "correction: " + metrics.timing.correction.toFixed(3) + space;
      //   }

      //   text += "bodies: " + bodies.length + space;

      //   if (engine.broadphase.controller === Grid)
      //     text += "buckets: " + metrics.buckets + space;

      //   text += "\n";

      //   text += "collisions: " + metrics.collisions + space;
      //   text += "pairs: " + engine.pairs.list.length + space;
      //   text += "broad: " + metrics.broadEff + space;
      //   text += "mid: " + metrics.midEff + space;
      //   text += "narrow: " + metrics.narrowEff + space;
      // }
      // @endif

      this.debugString = text;
      this.debugTimestamp = engine.timing.timestamp;
    }

    if (this.debugString) {
      c.font = "12px Arial";

      if (options.wireframes) {
        c.fillStyle = 'rgba(255,255,255,0.5)';
      } else {
        c.fillStyle = 'rgba(0,0,0,0.5)';
      }

      var split = this.debugString.split('\n');

      for (var i = 0; i < split.length; i++) {
        c.fillText(split[i], 50, 50 + i * 18);
      }
    }
  }

  /**
   * Description
   * @private
   * @method constraints
   * @param {constraint[]} constraints
   * @param {RenderingContext} context
   */

  private static constraints(constraints: Constraint[], context: CanvasRenderingContext2D) {
    var c = context;

    for (var i = 0; i < constraints.length; i++) {
      var constraint = constraints[i];

      if (!constraint.visible || !constraint.pointA || !constraint.pointB)
        continue;

      var bodyA = constraint.bodyA,
        bodyB = constraint.bodyB,
        start,
        end = Vector.Null;

      if (bodyA) {
        start = Vector.add(bodyA.position, constraint.pointA);
      } else {
        start = constraint.pointA;
      }

      if (constraint.renderType === 'pin') {
        c.beginPath();
        c.arc(start.x, start.y, 3, 0, 2 * Math.PI);
        c.closePath();
      } else {
        if (bodyB) {
          end = Vector.add(bodyB.position, constraint.pointB);
        } else {
          end = constraint.pointB;
        }

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
      }

      if (constraint.lineWidth) {
        c.lineWidth = constraint.lineWidth;
        c.strokeStyle = constraint.strokeStyle;
        c.stroke();
      }

      if (constraint.anchors) {
        c.fillStyle = constraint.strokeStyle;
        c.beginPath();
        c.arc(start.x, start.y, 3, 0, 2 * Math.PI);
        c.arc(end.x, end.y, 3, 0, 2 * Math.PI);
        c.closePath();
        c.fill();
      }
    }
  }

  /**
   * Description
   * @private
   * @method bodyShadows
   * @param {render} render
   * @param {body[]} bodies
   * @param {RenderingContext} context
   */

  private bodyShadows(bodies: Body[], context: CanvasRenderingContext2D) {
    var c = context,
      engine = this.engine;

    for (var i = 0; i < bodies.length; i++) {
      var body = bodies[i];

      if (!body.visible)
        continue;

      if (body.circleRadius) {
        c.beginPath();
        c.arc(body.position.x, body.position.y, body.circleRadius, 0, 2 * Math.PI);
        c.closePath();
      } else {
        c.beginPath();
        c.moveTo(body.vertices[0].x, body.vertices[0].y);
        for (var j = 1; j < body.vertices.length; j++) {
          c.lineTo(body.vertices[j].x, body.vertices[j].y);
        }
        c.closePath();
      }

      var distanceX = body.position.x - this.options.width * 0.5,
        distanceY = body.position.y - this.options.height * 0.2,
        distance = Math.abs(distanceX) + Math.abs(distanceY);

      c.shadowColor = 'rgba(0,0,0,0.15)';
      c.shadowOffsetX = 0.05 * distanceX;
      c.shadowOffsetY = 0.05 * distanceY;
      c.shadowBlur = 1 + 12 * Math.min(1, distance / 1000);

      c.fill();

      // FIXME
      // c.shadowColor = null;
      // c.shadowOffsetX = null;
      // c.shadowOffsetY = null;
      // c.shadowBlur = null;
    }
  }

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
    const showInternalEdges = options.showInternalEdges || !options.wireframes;
    const globalAlpha = this.globalAlpha;
    const defaultFont = options.defaultFont || "28px Arial";
    const defaultFontColor = options.defaultFontColor || 'gray';

    for (var i = 0; i < bodies.length; i++) {
      const body = bodies[i];

      if (!body.visible)
        continue;

      // handle compound parts
      for (var k = body.parts.length > 1 ? 1 : 0; k < body.parts.length; k++) {
        var part = body.parts[k];

        if (!part.visible)
          continue;

        // if (options.showSleeping && body.isSleeping) {
        //   c.globalAlpha = 0.5 * part.opacity;
        // } else 
        c.globalAlpha = globalAlpha;
        if (part.opacity !== 1) {
          c.globalAlpha *= part.opacity;
        }

        if (part.texture && !options.wireframes) {
          // part sprite
          const texture = _getTexture(part.texture);

          c.translate(part.position.x, part.position.y);
          c.rotate(part.angle);

          c.drawImage(
            texture,
            texture.width * -part.xOffset * part.xScale,
            texture.height * -part.yOffset * part.yScale,
            texture.width * part.xScale,
            texture.height * part.yScale
          );
          // revert translation, hopefully faster than save / restore
          c.rotate(-part.angle);
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
            c.closePath();
          }

          if (!options.wireframes) {
            c.fillStyle = part.fillStyle;

            if (part.lineWidth) {
              c.lineWidth = part.lineWidth;
              c.strokeStyle = part.strokeStyle;
              c.stroke();
            }
            c.fill();
          } else {
            c.lineWidth = 1;
            c.strokeStyle = '#bbb';
            c.stroke();
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
          c.textAlign = 'left';
          const width = ticker.width || 100;
          c.fillText(ticker.caption, - width / 2, 0);
          c.textAlign = 'right';
          c.fillText(text, width / 2, 0);
        }
        else {
          c.textAlign = 'center';
          if (ticker.width === 0) {
            const m = c.measureText(text);
            ticker.width = m.width;
            body.translate2(m.width / 2, 0);
            //body.bounds.update2(cx, cy, m.width, 30);
            body.bounds.dump('text-size');
          }
          c.fillText(text, 0, 0);
        }
        //c.rotate(-Math.PI);
        //c.translate(-cx, -cy);
        c.restore();
      }
      // quick anime
      if (ticker.move) {
        ticker.move(body, options.timestamp, this.world/*FIXME*/);
      }
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
      engine = this.engine,
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

    if (options.wireframes) {
      c.strokeStyle = 'indianred';
      c.lineWidth = 1;
    } else {
      c.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      c.globalCompositeOperation = 'overlay';
      c.lineWidth = 2;
    }

    c.stroke();
    c.globalCompositeOperation = 'source-over';
  };

  /**
   * Draws body positions
   * @private
   * @method bodyPositions
   * @param {render} render
   * @param {body[]} bodies
   * @param {RenderingContext} context
   */

  private bodyPositions(bodies: Body[], context: CanvasRenderingContext2D) {
    var c = context,
      engine = this.engine,
      options = this.options,
      body,
      part,
      i,
      k;

    c.beginPath();

    // render current positions
    for (i = 0; i < bodies.length; i++) {
      body = bodies[i];

      if (!body.visible)
        continue;

      // handle compound parts
      for (k = 0; k < body.parts.length; k++) {
        part = body.parts[k];
        c.arc(part.position.x, part.position.y, 3, 0, 2 * Math.PI, false);
        c.closePath();
      }
    }

    if (options.wireframes) {
      c.fillStyle = 'indianred';
    } else {
      c.fillStyle = 'rgba(0,0,0,0.5)';
    }
    c.fill();

    c.beginPath();

    // render previous positions
    for (i = 0; i < bodies.length; i++) {
      body = bodies[i];
      if (body.visible) {
        c.arc(body.positionPrev.x, body.positionPrev.y, 2, 0, 2 * Math.PI, false);
        c.closePath();
      }
    }

    c.fillStyle = 'rgba(255,165,0,0.8)';
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
    var c = context;

    c.beginPath();

    for (var i = 0; i < bodies.length; i++) {
      var body = bodies[i];

      if (!body.visible)
        continue;

      c.moveTo(body.position.x, body.position.y);
      c.lineTo(body.position.x + (body.position.x - body.positionPrev.x) * 2, body.position.y + (body.position.y - body.positionPrev.y) * 2);
    }

    c.lineWidth = 3;
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
      pair,
      collision,
      corrected,
      bodyA,
      bodyB,
      i,
      j;

    c.beginPath();

    // render collision positions
    for (i = 0; i < pairs.length; i++) {
      pair = pairs[i];

      if (!pair.isActive)
        continue;

      collision = pair.collision;
      for (j = 0; j < pair.activeContacts.length; j++) {
        var contact = pair.activeContacts[j],
          vertex = contact.vertex;
        c.rect(vertex.x - 1.5, vertex.y - 1.5, 3.5, 3.5);
      }
    }

    if (options.wireframes) {
      c.fillStyle = 'rgba(255,255,255,0.7)';
    } else {
      c.fillStyle = 'orange';
    }
    c.fill();

    c.beginPath();

    // render collision normals
    for (i = 0; i < pairs.length; i++) {
      pair = pairs[i];

      if (!pair.isActive)
        continue;

      collision = pair.collision!;

      if (pair.activeContacts.length > 0) {
        var normalPosX = pair.activeContacts[0].vertex.x,
          normalPosY = pair.activeContacts[0].vertex.y;

        if (pair.activeContacts.length === 2) {
          normalPosX = (pair.activeContacts[0].vertex.x + pair.activeContacts[1].vertex.x) / 2;
          normalPosY = (pair.activeContacts[0].vertex.y + pair.activeContacts[1].vertex.y) / 2;
        }

        if (collision.bodyB === collision.supports[0].body || collision.bodyA.isStatic === true) {
          c.moveTo(normalPosX - collision.normal.x * 8, normalPosY - collision.normal.y * 8);
        } else {
          c.moveTo(normalPosX + collision.normal.x * 8, normalPosY + collision.normal.y * 8);
        }

        c.lineTo(normalPosX, normalPosY);
      }
    }

    if (options.wireframes) {
      c.strokeStyle = 'rgba(255,165,0,0.7)';
    } else {
      c.strokeStyle = 'orange';
    }

    c.lineWidth = 1;
    c.stroke();
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

    if (options.wireframes) {
      c.strokeStyle = 'rgba(255,165,0,0.5)';
    } else {
      c.strokeStyle = 'orange';
    }
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
    var c = context,
      options = this.options;

    if (options.wireframes) {
      c.strokeStyle = 'rgba(255,180,0,0.1)';
    } else {
      c.strokeStyle = 'rgba(255,180,0,0.5)';
    }

    c.beginPath();

    var bucketKeys = Common.keys(grid.buckets);

    for (var i = 0; i < bucketKeys.length; i++) {
      var bucketId = bucketKeys[i];

      if (grid.buckets[bucketId].length < 2)
        continue;

      var region = bucketId.split(/C|R/);
      c.rect(0.5 + parseInt(region[1], 10) * grid.bucketWidth,
        0.5 + parseInt(region[2], 10) * grid.bucketHeight,
        grid.bucketWidth,
        grid.bucketHeight);
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