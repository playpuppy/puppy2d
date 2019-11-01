// The following code comes from matter.js
// 
// Copyright(c) Liam Brummitt and contributors.
// The MIT License (MIT)
// 
// Porting to TypeScript by Kimio Kuramitsu 

import { Common } from './commons';
import { Vector, Contact, Vertex, Vertices, Bounds } from './geometry';
import { Body, Filter, World } from './body';
import { Bodies } from './factory';
//import assert from 'assert';

/**
* The `Matter.Pair` module contains methods for creating and manipulating collision pairs.
*
* @class Pair
*/

export type Collision = {
  body: Body;
  bodyA: Body;
  bodyB: Body;
  collided: boolean;
  supports: Vertex[];
  parentA: Body;
  parentB: Body;
  depth: number;
  axisBody: Body;
  axisNumber: number;
  reused: boolean;
  normal: Vector;
  tangent: Vector;
  penetration: Vector; //?
}

//const CollisionNull: Collision = {} as Collision;

export class Pair {
  public id: string;
  public bodyA: Body;
  public bodyB: Body;
  public activeContacts: Contact[] = [];
  public separation = 0;
  public isActive = true;
  public confirmedActive = true;
  public isSensor: boolean;
  public timeCreated: number;
  public timeUpdated: number;
  public collision: Collision | undefined; // = CollisionNull;
  public inverseMass = 0;
  public friction = 0;
  public frictionStatic = 0;
  public restitution = 0;
  public slop = 0;

  /**
 * Get the id for the given pair.
 * @method id
 * @param {body} bodyA
 * @param {body} bodyB
 * @return {string} Unique pairId
 */
  public static id(bodyA: Body, bodyB: Body): string {
    if (bodyA.id < bodyB.id) {
      return 'A' + bodyA.id + 'B' + bodyB.id;
    } else {
      return 'A' + bodyB.id + 'B' + bodyA.id;
    }
  }

  /**
   * Creates a pair.
   * @method create
   * @param {collision} collision
   * @param {number} timestamp
   * @return {pair} A new pair
   */

  public constructor(collision: Collision, timestamp: number) {
    this.bodyA = collision.bodyA;
    this.bodyB = collision.bodyB;
    this.id = Pair.id(this.bodyA, this.bodyB);
    this.isSensor = this.bodyA.isSensor || this.bodyB.isSensor;
    this.timeCreated = timestamp;
    this.timeUpdated = timestamp;
    this.update(collision, timestamp);
  }

  /**
   * Updates a pair given a collision.
   * @method update
   * @param {pair} this
   * @param {collision} collision
   * @param {number} timestamp
   */

  public update(collision: Collision, timestamp: number) {
    this.collision = collision;

    if (collision.collided) {
      const supports = collision.supports;
      const activeContacts = this.activeContacts;
      const parentA = collision.parentA;
      const parentB = collision.parentB;

      this.inverseMass = parentA.inverseMass + parentB.inverseMass;
      this.friction = Math.min(parentA.friction, parentB.friction);
      this.frictionStatic = Math.max(parentA.frictionStatic, parentB.frictionStatic);
      this.restitution = Math.max(parentA.restitution, parentB.restitution);
      this.slop = Math.max(parentA.slop, parentB.slop);

      for (var i = 0; i < supports.length; i++) {
        activeContacts[i] = supports[i].contact;
      }

      // optimise array size
      var supportCount = supports.length;
      if (supportCount < activeContacts.length) {
        activeContacts.length = supportCount;
      }

      this.separation = collision.depth;
      this.setActive(true, timestamp);
    } else {
      if (this.isActive === true)
        this.setActive(false, timestamp);
    }
  }

  /**
   * Set a pair as active or inactive.
   * @method setActive
   * @param {pair} this
   * @param {bool} isActive
   * @param {number} timestamp
   */

  public setActive(isActive: boolean, timestamp: number) {
    if (isActive) {
      this.isActive = true;
      this.timeUpdated = timestamp;
    } else {
      this.isActive = false;
      this.activeContacts.length = 0;
    }
  }
}

/**

* The `Matter.Pairs` module contains methods for creating and manipulating collision pair sets.
*
* @class Pairs
*/

const _pairMaxIdleLife = 1000;

export class Pairs {

  public table: { [key: string]: Pair; } = {};
  public list: Pair[] = [];
  public collisionStart: Pair[] = [];
  public collisionActive: Pair[] = [];
  public collisionEnd: Pair[] = [];

  /**
   * Creates a new pairs structure.
   * @method create
   * @param {object} options
   * @return {pairs} A new pairs structure
   */

  public constructor(options?: any) {
    if (options !== undefined) {
      Object.assign(this, options);
    }
  }

  /**
   * Updates pairs given a list of collisions.
   * @method update
   * @param {object} this
   * @param {collision[]} collisions
   * @param {number} timestamp
   */

  public update2(collisions: Collision[], timestamp: number) {
    const pairsList = this.list;
    const pairsTable = this.table;
    const collisionStart = this.collisionStart;
    const collisionEnd = this.collisionEnd;
    const collisionActive = this.collisionActive;

    // clear collision state arrays, but maintain old reference
    collisionStart.length = 0;
    collisionEnd.length = 0;
    collisionActive.length = 0;

    for (var i = 0; i < pairsList.length; i++) {
      pairsList[i].confirmedActive = false;
    }

    for (var i = 0; i < collisions.length; i++) {
      const collision = collisions[i];

      if (collision.collided) {
        const pairId = Pair.id(collision.bodyA, collision.bodyB);
        const pair = pairsTable[pairId];

        if (pair) {
          // pair already exists (but may or may not be active)
          if (pair.isActive) {
            // pair exists and is active
            collisionActive.push(pair);
          } else {
            // pair exists but was inactive, so a collision has just started again
            collisionStart.push(pair);
          }

          // update the pair
          pair.update(collision, timestamp);
          pair.confirmedActive = true;
        } else {
          // pair did not exist, create a new pair
          const pair = new Pair(collision, timestamp);
          pairsTable[pairId] = pair;

          // push the new pair
          collisionStart.push(pair);
          pairsList.push(pair);
        }
      }
    }

    // deactivate previously active pairs that are now inactive
    for (i = 0; i < pairsList.length; i++) {
      const pair = pairsList[i];
      if (pair.isActive && !pair.confirmedActive) {
        pair.setActive(false, timestamp);
        collisionEnd.push(pair);
      }
    }
  }

  /**
   * Finds and removes pairs that have been inactive for a set amount of time.
   * @method removeOld
   * @param {object} pairs
   * @param {number} timestamp
   */

  public removeOld(timestamp: number) {
    const pairsList = this.list;
    const pairsTable = this.table;
    const indexesToRemove = [];
    // pair,
    // collision,
    // pairIndex,

    for (var i = 0; i < pairsList.length; i++) {
      const pair = pairsList[i];
      const collision = pair.collision;

      // never remove sleeping pairs
      if (collision!.bodyA.isSleeping || collision!.bodyB.isSleeping) {
        pair.timeUpdated = timestamp;
        continue;
      }

      // if pair is inactive for too long, mark it to be removed
      if (timestamp - pair.timeUpdated > _pairMaxIdleLife) {
        indexesToRemove.push(i);
      }
    }

    // remove marked pairs
    for (var i = 0; i < indexesToRemove.length; i++) {
      const pairIndex = indexesToRemove[i] - i;
      const pair = pairsList[pairIndex];
      delete pairsTable[pair.id];
      pairsList.splice(pairIndex, 1);
    }
  }

  /**
   * Clears the given pairs structure.
   * @method clear
   * @param {pairs} pairs
   * @return {pairs} pairs
   */
  public clear() {
    this.table = {};
    this.list.length = 0;
    this.collisionStart.length = 0;
    this.collisionActive.length = 0;
    this.collisionEnd.length = 0;
    return this;
  }
}

/**
* The `Matter.SAT` module contains methods for detecting collisions using the Separating Axis Theorem.
*
* @class SAT
*/

export type Overlap = {
  overlap: number;
  axis: Vector;
  axisNumber: number;
}

export type Projection = {
  min: number;
  max: number;
}

// TODO: true circles and curves

class SAT {

  /**
   * Detect collision between two bodies using the Separating Axis Theorem.
   * @method collides
   * @param {body} bodyA
   * @param {body} bodyB
   * @param {collision} previousCollision
   * @return {collision} collision
   */

  public static collides(bodyA: Body, bodyB: Body, previousCollision: Collision | null) {
    // var overlapAB: Overlap;
    // var overlapBA: Overlap;
    // var minOverlap: Overlap;
    // var collision: Collision;
    const canReusePrevCol = false;

    if (previousCollision) {
      // estimate total motion
      const parentA = bodyA.parent as Body;
      const parentB = bodyB.parent as Body;
      const motion = parentA.speed * parentA.speed + parentA.angularSpeed * parentA.angularSpeed
        + parentB.speed * parentB.speed + parentB.angularSpeed * parentB.angularSpeed;

      // we may be able to (partially) reuse collision result 
      // but only safe if collision was resting
      const canReusePrevCol = previousCollision && previousCollision.collided && motion < 0.2;

      // reuse collision object
      var collision = previousCollision;
    } else {
      collision = { collided: false, bodyA: bodyA, bodyB: bodyB } as Collision;
    }

    if (previousCollision && canReusePrevCol) {
      // if we can reuse the collision result
      // we only need to test the previously found axis
      const axisBodyA = collision.axisBody;
      const axisBodyB = axisBodyA === bodyA ? bodyB : bodyA;
      const axes = [axisBodyA.axes[previousCollision.axisNumber]];

      var minOverlap = SAT.overlapAxes(axisBodyA.vertices, axisBodyB.vertices, axes);
      collision.reused = true;

      if (minOverlap.overlap <= 0) {
        collision.collided = false;
        return collision;
      }
    } else {
      // if we can't reuse a result, perform a full SAT test

      const overlapAB = SAT.overlapAxes(bodyA.vertices, bodyB.vertices, bodyA.axes);

      if (overlapAB.overlap <= 0) {
        collision.collided = false;
        return collision;
      }

      const overlapBA = SAT.overlapAxes(bodyB.vertices, bodyA.vertices, bodyB.axes);

      if (overlapBA.overlap <= 0) {
        collision.collided = false;
        return collision;
      }

      if (overlapAB.overlap < overlapBA.overlap) {
        minOverlap = overlapAB;
        collision.axisBody = bodyA;
      } else {
        minOverlap = overlapBA;
        collision.axisBody = bodyB;
      }

      // important for reuse later
      collision.axisNumber = minOverlap.axisNumber;
    }

    collision.bodyA = bodyA.id < bodyB.id ? bodyA : bodyB;
    collision.bodyB = bodyA.id < bodyB.id ? bodyB : bodyA;
    collision.collided = true;
    collision.depth = minOverlap.overlap;
    collision.parentA = collision.bodyA.parent as Body;
    collision.parentB = collision.bodyB.parent as Body;

    bodyA = collision.bodyA;
    bodyB = collision.bodyB;

    // ensure normal is facing away from bodyA
    if (Vector.dot(minOverlap.axis, Vector.sub(bodyB.position, bodyA.position)) < 0) {
      collision.normal = new Vector(
        minOverlap.axis.x,
        minOverlap.axis.y
      );
    } else {
      collision.normal = new Vector(
        -minOverlap.axis.x,
        -minOverlap.axis.y
      );
    }

    collision.tangent = Vector.perp(collision.normal);

    collision.penetration = collision.penetration || {};
    collision.penetration.x = collision.normal.x * collision.depth;
    collision.penetration.y = collision.normal.y * collision.depth;

    // find support points, there is always either exactly one or two
    const verticesB = SAT.findSupports(bodyA, bodyB, collision.normal);
    const supports: Vertex[] = [];

    // find the supports from bodyB that are inside bodyA
    if (Vertices.contains(bodyA.vertices, verticesB[0]))
      supports.push(verticesB[0]);

    if (Vertices.contains(bodyA.vertices, verticesB[1]))
      supports.push(verticesB[1]);

    // find the supports from bodyA that are inside bodyB
    if (supports.length < 2) {
      const verticesA = SAT.findSupports(bodyB, bodyA, Vector.neg(collision.normal));

      if (Vertices.contains(bodyB.vertices, verticesA[0]))
        supports.push(verticesA[0]);

      if (supports.length < 2 && Vertices.contains(bodyB.vertices, verticesA[1]))
        supports.push(verticesA[1]);
    }

    // account for the edge case of overlapping but no vertex containment
    if (supports.length < 1)
      collision.supports = [verticesB[0]];

    collision.supports = supports;

    return collision;
  }

  /**
   * Find the overlap between two sets of vertices.
   * @method _overlapAxes
   * @private
   * @param {} verticesA
   * @param {} verticesB
   * @param {} axes
   * @return result
   */

  private static overlapAxes(verticesA: Vertex[], verticesB: Vertex[], axes: Vector[]): Overlap {
    const projectionA = { min: 0, max: 0 } //Vector._temp[0];
    const projectionB = { min: 0, max: 0 } //Vector._temp[1];
    const result = { overlap: Number.MAX_VALUE } as Overlap;

    for (var i = 0; i < axes.length; i++) {
      const axis = axes[i];

      SAT.projectToAxis(projectionA, verticesA, axis);
      SAT.projectToAxis(projectionB, verticesB, axis);

      const overlap = Math.min(projectionA.max - projectionB.min, projectionB.max - projectionA.min);

      if (overlap <= 0) {
        result.overlap = overlap;
        return result as Overlap;
      }

      if (overlap < result.overlap) {
        result.overlap = overlap;
        result.axis = axis;
        result.axisNumber = i;
      }
    }
    return result as Overlap;
  }

  /**
   * Projects vertices on an axis and returns an interval.
   * @method _projectToAxis
   * @private
   * @param {} projection
   * @param {} vertices
   * @param {} axis
   */
  private static projectToAxis(projection: Projection, vertices: Vertex[], axis: Vector) {
    var min = Vector.dot(vertices[0], axis);
    var max = min;

    for (var i = 1; i < vertices.length; i += 1) {
      var dot = Vector.dot(vertices[i], axis);

      if (dot > max) {
        max = dot;
      } else if (dot < min) {
        min = dot;
      }
    }
    projection.min = min;
    projection.max = max;
  }

  /**
   * Finds supporting vertices given two bodies along a given direction using hill-climbing.
   * @method findSupports
   * @private
   * @param {} bodyA
   * @param {} bodyB
   * @param {} normal
   * @return [vector]
   */

  private static findSupports = function (bodyA: Body, bodyB: Body, normal: Vector): Vertex[] {
    var nearestDistance = Number.MAX_VALUE;
    const vertices = bodyB.vertices;
    const bodyAPosition = bodyA.position;
    const vertexToBody = Vector._temp[0];
    var distance: number = 0;
    var vertexA: Vertex = {} as Vertex;
    var vertexB: Vertex;

    // find closest vertex on bodyB
    for (var i = 0; i < vertices.length; i++) {
      var vertex = vertices[i];
      vertexToBody.x = vertex.x - bodyAPosition.x;
      vertexToBody.y = vertex.y - bodyAPosition.y;
      var distance = -Vector.dot(normal, vertexToBody);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        vertexA = vertex;
      }
    }

    // find next closest vertex using the two connected to it
    var prevIndex = vertexA.index - 1 >= 0 ? vertexA.index - 1 : vertices.length - 1;
    vertex = vertices[prevIndex];
    vertexToBody.x = vertex.x - bodyAPosition.x;
    vertexToBody.y = vertex.y - bodyAPosition.y;
    nearestDistance = -Vector.dot(normal, vertexToBody);
    vertexB = vertex;

    var nextIndex = (vertexA.index + 1) % vertices.length;
    vertex = vertices[nextIndex];
    vertexToBody.x = vertex.x - bodyAPosition.x;
    vertexToBody.y = vertex.y - bodyAPosition.y;
    distance = -Vector.dot(normal, vertexToBody);
    if (distance < nearestDistance) {
      vertexB = vertex;
    }
    return [vertexA, vertexB];
  }

}

/**
* The `Matter.Detector` module contains methods for detecting collisions given a set of pairs.
*
* @class Detector
*/

// type Filter = {
//   group: number;
//   mask: number;
//   category: number;
// }

// TODO: speculative contacts

// var SAT = require('./SAT');
// var Pair = require('./Pair');
// var Bounds = require('../geometry/Bounds');

export class Detector {

  /**
   * Finds all collisions given a list of pairs.
   * @method collisions
   * @param {pair[]} broadphasePairs
   * @param {engine} engine
   * @return {array} collisions
   */

  public static collisions(broadphasePairs: [Body, Body, number][], engine: any) {
    var collisions: Collision[] = [];
    var pairsTable = engine.pairs.table;

    // @if DEBUG
    // var metrics = engine.metrics;
    // @endif

    for (var i = 0; i < broadphasePairs.length; i++) {
      const bodyA = broadphasePairs[i][0];
      const bodyB = broadphasePairs[i][1];

      if ((bodyA.isStatic || bodyA.isSleeping) && (bodyB.isStatic || bodyB.isSleeping))
        continue;

      if (!Detector.canCollide(bodyA.collisionFilter, bodyB.collisionFilter))
        continue;

      // @if DEBUG
      // metrics.midphaseTests += 1;
      // @endif

      // mid phase
      if (Bounds.overlaps(bodyA.bounds, bodyB.bounds)) {
        for (var j = bodyA.parts.length > 1 ? 1 : 0; j < bodyA.parts.length; j++) {
          var partA = bodyA.parts[j];

          for (var k = bodyB.parts.length > 1 ? 1 : 0; k < bodyB.parts.length; k++) {
            var partB = bodyB.parts[k];

            if ((partA === bodyA && partB === bodyB) || Bounds.overlaps(partA.bounds, partB.bounds)) {
              // find a previous collision we could reuse
              const pairId = Pair.id(partA, partB);
              const pair = pairsTable[pairId];
              var previousCollision: Collision | null;

              if (pair && pair.isActive) {
                previousCollision = pair.collision;
              } else {
                previousCollision = null;
              }

              // narrow phase
              var collision = SAT.collides(partA, partB, previousCollision);
              // @if DEBUG
              //metrics.narrowphaseTests += 1;
              //if (collision.reused)
              //  metrics.narrowReuseCount += 1;
              // @endif

              if (collision.collided) {
                collisions.push(collision);
                // @if DEBUG
                // metrics.narrowDetections += 1;
                // @endif
              }
            }
          }
        }
      }
    }
    return collisions;
  }

  /**
   * Returns `true` if both supplied collision filters will allow a collision to occur.
   * See `body.collisionFilter` for more information.
   * @method canCollide
   * @param {} filterA
   * @param {} filterB
   * @return {bool} `true` if collision can occur
   */

  public static canCollide(filterA: Filter, filterB: Filter) {
    if (filterA.group === filterB.group && filterA.group !== 0)
      return filterA.group > 0;

    return (filterA.mask & filterB.category) !== 0 && (filterB.mask & filterA.category) !== 0;
  }
}

/**
* The `Matter.Grid` module contains methods for creating and manipulating collision broadphase grid structures.
*
* @class Grid
*/

type Region = {
  id: string;
  startCol: number;
  endCol: number;
  startRow: number;
  endRow: number;
}

export class Grid {
  // public controller = Grid;
  public readonly detector = Detector.collisions;
  public buckets: { [key: string]: Body[]; } = {};
  public pairs: { [key: string]: [Body, Body, number]; } = {}; // id: [body, body, 1]
  public pairsList: [Body, Body, number][] = [];
  public bucketWidth = 48;
  public bucketHeight = 48;

  /**
   * Creates a new grid.
   * @method create
   * @param {} options
   * @return {grid} A new grid
   */

  public constructor(options?: any) {
    if (options !== undefined) {
      Object.assign(this, options);
    }
  }

  /**
   * Updates the grid.
   * @method update
   * @param {grid} this
   * @param {body[]} bodies
   * @param {engine} engine
   * @param {boolean} forceUpdate
   */

  public update(bodies: Body[], world: World, forceUpdate: boolean) {
    const buckets = this.buckets;
    var gridChanged = false;

    // @if DEBUG
    // var metrics = engine.metrics;
    // metrics.broadphaseTests = 0;
    // @endif
    const worldMinX = Math.min(world.bounds.min.x, world.bounds.max.x)
    const worldMinY = Math.min(world.bounds.min.y, world.bounds.max.y)
    const worldMaxX = Math.max(world.bounds.min.x, world.bounds.max.x)
    const worldMaxY = Math.max(world.bounds.min.y, world.bounds.max.y)

    for (var i = 0; i < bodies.length; i++) {
      const body = bodies[i];

      if (body.isSleeping && !forceUpdate)
        continue;

      // don't update out of world bodies

      if (body.bounds.max.x < worldMinX || body.bounds.min.x > worldMaxX
        || body.bounds.max.y < worldMinY || body.bounds.min.y > worldMaxY) {
        //body.bounds.dump(`body ${body.id}`);
        continue;
      }

      var newRegion = Grid.getRegion(this, body);
      var bodyRegion = (body as any)['region'] as Region;

      // if the body has changed grid region
      if (!bodyRegion || newRegion.id !== bodyRegion.id || forceUpdate) {

        // @if DEBUG
        // metrics.broadphaseTests += 1;
        // @endif

        if (!bodyRegion || forceUpdate) {
          (body as any)['region'] = newRegion;
          bodyRegion = newRegion;
        }

        var union = Grid.regionUnion(newRegion, bodyRegion);

        // update grid buckets affected by region change
        // iterate over the union of both regions
        for (var col = union.startCol; col <= union.endCol; col++) {
          for (var row = union.startRow; row <= union.endRow; row++) {
            var bucketId = Grid.getBucketId(col, row);
            var bucket = buckets[bucketId];

            var isInsideNewRegion = (col >= newRegion.startCol && col <= newRegion.endCol
              && row >= newRegion.startRow && row <= newRegion.endRow);

            var isInsideOldRegion = (col >= bodyRegion.startCol && col <= bodyRegion.endCol
              && row >= bodyRegion.startRow && row <= bodyRegion.endRow);

            // remove from old region buckets
            if (!isInsideNewRegion && isInsideOldRegion) {
              if (isInsideOldRegion) {
                if (bucket)
                  Grid.bucketRemoveBody(this, bucket, body);
              }
            }

            // add to new region buckets
            if (bodyRegion === newRegion || (isInsideNewRegion && !isInsideOldRegion) || forceUpdate) {
              if (!bucket)
                bucket = Grid.createBucket(buckets, bucketId);
              Grid.bucketAddBody(this, bucket, body);
            }
          }
        }

        // set the new region
        (body as any)['region'] = newRegion;

        // flag changes so we can update pairs
        gridChanged = true;
      }
    }

    // update pairs list only if pairs changed (i.e. a body changed region)
    if (gridChanged)
      this.pairsList = Grid.createActivePairsList(this);
  }

  /**
   * Clears the grid.
   * @method clear
   * @param {grid} this
   */
  public clear() {
    this.buckets = {};
    this.pairs = {};
    this.pairsList = [];
  }

  /**
   * Finds the union of two regions.
   * @method _regionUnion
   * @private
   * @param {} regionA
   * @param {} regionB
   * @return {} region
   */

  private static regionUnion(regionA: Region, regionB: Region) {
    const startCol = Math.min(regionA.startCol, regionB.startCol);
    const endCol = Math.max(regionA.endCol, regionB.endCol);
    const startRow = Math.min(regionA.startRow, regionB.startRow);
    const endRow = Math.max(regionA.endRow, regionB.endRow);
    return Grid.createRegion(startCol, endCol, startRow, endRow);
  }

  /**
   * Gets the region a given body falls in for a given grid.
   * @method _getRegion
   * @private
   * @param {} grid
   * @param {} body
   * @return {} region
   */

  private static getRegion(grid: Grid, body: Body) {
    const bounds = body.bounds;
    const startCol = Math.floor(bounds.min.x / grid.bucketWidth);
    const endCol = Math.floor(bounds.max.x / grid.bucketWidth);
    const startRow = Math.floor(bounds.min.y / grid.bucketHeight);
    const endRow = Math.floor(bounds.max.y / grid.bucketHeight);
    return Grid.createRegion(startCol, endCol, startRow, endRow);
  }

  /**
   * Creates a region.
   * @method _createRegion
   * @private
   * @param {} startCol
   * @param {} endCol
   * @param {} startRow
   * @param {} endRow
   * @return {} region
   */

  private static createRegion(startCol: number, endCol: number, startRow: number, endRow: number): Region {
    return {
      id: startCol + ',' + endCol + ',' + startRow + ',' + endRow,
      startCol: startCol,
      endCol: endCol,
      startRow: startRow,
      endRow: endRow
    };
  }

  /**
   * Gets the bucket id at the given position.
   * @method getBucketId
   * @private
   * @param {} column
   * @param {} row
   * @return {string} bucket id
   */

  private static getBucketId(column: number, row: number) {
    return 'C' + column + 'R' + row;
  }

  /**
   * Creates a bucket.
   * @method createBucket
   * @private
   * @param {} buckets
   * @param {} bucketId
   * @return {} bucket
   */

  private static createBucket(buckets: { [key: string]: Body[]; }, bucketId: string) {
    var bucket = buckets[bucketId] = [];
    return bucket;
  }

  /**
   * Adds a body to a bucket.
   * @method _bucketAddBody
   * @private
   * @param {} grid
   * @param {} bucket
   * @param {} body
   */

  private static bucketAddBody(grid: Grid, bucket: Body[], body: Body) {
    // add new pairs
    for (var i = 0; i < bucket.length; i++) {
      const bodyB = bucket[i];

      if (body.id === bodyB.id || (body.isStatic && bodyB.isStatic))
        continue;

      // keep track of the number of buckets the pair exists in
      // important for Grid.update to work
      const pairId = Pair.id(body, bodyB);
      const pair = grid.pairs[pairId];

      if (pair) {
        pair[2] += 1;
      } else {
        grid.pairs[pairId] = [body, bodyB, 1];
      }
    }

    // add to bodies (after pairs, otherwise pairs with self)
    bucket.push(body);
  }

  /**
   * Removes a body from a bucket.
   * @method _bucketRemoveBody
   * @private
   * @param {} grid
   * @param {} bucket
   * @param {} body
   */

  private static bucketRemoveBody(grid: Grid, bucket: Body[], body: Body) {
    // remove from bucket
    bucket.splice(bucket.indexOf(body), 1);

    // update pair counts
    for (var i = 0; i < bucket.length; i++) {
      // keep track of the number of buckets the pair exists in
      // important for _createActivePairsList to work
      const bodyB = bucket[i];
      const pairId = Pair.id(body, bodyB);
      const pair = grid.pairs[pairId];

      if (pair)
        pair[2] -= 1;
    }
  }

  /**
   * Generates a list of the active pairs in the grid.
   * @method _createActivePairsList
   * @private
   * @param {} grid
   * @return [] pairs
   */

  private static createActivePairsList(grid: Grid) {
    const pairs: [Body, Body, number][] = [];

    // grid.pairs is used as a hashmap
    var pairKeys = Common.keys(grid.pairs);

    // iterate over grid.pairs
    for (var k = 0; k < pairKeys.length; k++) {
      const pair = grid.pairs[pairKeys[k]];

      // if pair exists in at least one bucket
      // it is a pair that needs further collision testing so push it
      if (pair[2] > 0) {
        pairs.push(pair);
      } else {
        delete grid.pairs[pairKeys[k]];
      }
    }
    return pairs;
  }
}

/**
* The `Matter.Query` module contains methods for performing collision queries.
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class Query
*/

export class Query {

  /**
   * Returns a list of collisions between `body` and `bodies`.
   * @method collides
   * @param {body} body
   * @param {body[]} bodies
   * @return {object[]} Collisions
   */

  public static collides = function (body: Body, bodies: Body[]) {
    var collisions: Collision[] = [];

    for (var i = 0; i < bodies.length; i++) {
      const bodyA = bodies[i];

      if (Bounds.overlaps(bodyA.bounds, body.bounds)) {
        for (var j = bodyA.parts.length === 1 ? 0 : 1; j < bodyA.parts.length; j++) {
          var part = bodyA.parts[j];

          if (Bounds.overlaps(part.bounds, body.bounds)) {
            var collision = SAT.collides(part, body, null);

            if (collision.collided) {
              collisions.push(collision);
              break;
            }
          }
        }
      }
    }
    return collisions;
  }

  /**
   * Casts a ray segment against a set of bodies and returns all collisions, ray width is optional. Intersection points are not provided.
   * @method ray
   * @param {body[]} bodies
   * @param {vector} startPoint
   * @param {vector} endPoint
   * @param {number} [rayWidth]
   * @return {object[]} Collisions
   */

  public static ray(bodies: Body[], startPoint: Vector, endPoint: Vector, rayWidth = 1e-100) {
    const rayAngle = Vector.angle(startPoint, endPoint);
    const rayLength = Vector.magnitude(Vector.sub(startPoint, endPoint));
    const rayX = (endPoint.x + startPoint.x) * 0.5;
    const rayY = (endPoint.y + startPoint.y) * 0.5;
    const ray = Bodies.rectangle(rayX, rayY, rayLength, rayWidth, { angle: rayAngle });
    const collisions = Query.collides(ray, bodies);

    for (var i = 0; i < collisions.length; i += 1) {
      var collision = collisions[i];
      collision.body = collision.bodyB = collision.bodyA;
    }
    return collisions;
  }

  /**
   * Returns all bodies whose bounds are inside (or outside if set) the given set of bounds, from the given set of bodies.
   * @method region
   * @param {body[]} bodies
   * @param {bounds} bounds
   * @param {bool} [outside=false]
   * @return {body[]} The bodies matching the query
   */

  public static region(bodies: Body[], bounds: Bounds, outside = false) {
    var result: Body[] = [];

    for (var i = 0; i < bodies.length; i++) {
      var body = bodies[i],
        overlaps = Bounds.overlaps(body.bounds, bounds);
      if ((overlaps && !outside) || (!overlaps && outside))
        result.push(body);
    }

    return result;
  }

  /**
   * Returns all bodies whose vertices contain the given point, from the given set of bodies.
   * @method point
   * @param {body[]} bodies
   * @param {vector} point
   * @return {body[]} The bodies matching the query
   */
  public static point(bodies: Body[], point: Vector) {
    var result = [];

    for (var i = 0; i < bodies.length; i++) {
      var body = bodies[i];

      if (Bounds.contains(body.bounds, point)) {
        for (var j = body.parts.length === 1 ? 0 : 1; j < body.parts.length; j++) {
          var part = body.parts[j];

          if (Bounds.contains(part.bounds, point)
            && Vertices.contains(part.vertices, point)) {
            result.push(body);
            break;
          }
        }
      }
    }
    return result;
  }
}

/**
* The `Matter.Resolver` module contains methods for resolving collision pairs.
*
* @class Resolver
*/

const _restingThresh = 4;
const _restingThreshTangent = 6;
const _positionDampen = 0.9;
const _positionWarming = 0.8;
const _frictionNormalMultiplier = 5;

export class Resolver {

  /**
   * Prepare pairs for position solving.
   * @method preSolvePosition
   * @param {pair[]} pairs
   */
  public static preSolvePosition(pairs: Pair[]) {
    var i,
      pair,
      activeCount;

    // find total contacts on each body
    for (i = 0; i < pairs.length; i++) {
      pair = pairs[i];

      if (!pair.isActive)
        continue;

      activeCount = pair.activeContacts.length;
      pair.collision!.parentA.totalContacts += activeCount;
      pair.collision!.parentB.totalContacts += activeCount;
    }
  }

  /**
   * Find a solution for pair positions.
   * @method solvePosition
   * @param {pair[]} pairs
   * @param {body[]} bodies
   * @param {number} timeScale
   */

  public static solvePosition(pairs: Pair[], bodies: Body[], timeScale: number) {
    var i,
      normalX,
      normalY,
      pair,
      collision,
      bodyA,
      bodyB,
      normal,
      separation,
      penetration,
      positionImpulseA,
      positionImpulseB,
      contactShare,
      bodyBtoAX,
      bodyBtoAY,
      positionImpulse,
      impulseCoefficient = timeScale * _positionDampen;

    for (i = 0; i < bodies.length; i++) {
      var body = bodies[i];
      body.previousPositionImpulse.x = body.positionImpulse.x;
      body.previousPositionImpulse.y = body.positionImpulse.y;
    }

    // find impulses required to resolve penetration
    for (i = 0; i < pairs.length; i++) {
      pair = pairs[i];

      if (!pair.isActive || pair.isSensor)
        continue;

      collision = pair.collision!;
      bodyA = collision.parentA;
      bodyB = collision.parentB;
      normal = collision.normal;

      positionImpulseA = bodyA.previousPositionImpulse;
      positionImpulseB = bodyB.previousPositionImpulse;

      penetration = collision.penetration;

      bodyBtoAX = positionImpulseB.x - positionImpulseA.x + penetration.x;
      bodyBtoAY = positionImpulseB.y - positionImpulseA.y + penetration.y;

      normalX = normal.x;
      normalY = normal.y;

      separation = normalX * bodyBtoAX + normalY * bodyBtoAY;
      pair.separation = separation;

      positionImpulse = (separation - pair.slop) * impulseCoefficient;

      if (bodyA.isStatic || bodyB.isStatic)
        positionImpulse *= 2;

      if (!(bodyA.isStatic || bodyA.isSleeping)) {
        contactShare = positionImpulse / bodyA.totalContacts;
        bodyA.positionImpulse.x += normalX * contactShare;
        bodyA.positionImpulse.y += normalY * contactShare;
      }

      if (!(bodyB.isStatic || bodyB.isSleeping)) {
        contactShare = positionImpulse / bodyB.totalContacts;
        bodyB.positionImpulse.x -= normalX * contactShare;
        bodyB.positionImpulse.y -= normalY * contactShare;
      }
    }
  }

  /**
   * Apply position resolution.
   * @method postSolvePosition
   * @param {body[]} bodies
   */

  public static postSolvePosition(bodies: Body[]) {
    for (var i = 0; i < bodies.length; i++) {
      var body = bodies[i];

      // reset contact count
      body.totalContacts = 0;

      if (body.positionImpulse.x !== 0 || body.positionImpulse.y !== 0) {
        // update body geometry
        for (var j = 0; j < body.parts.length; j++) {
          var part = body.parts[j];
          Vertices.translate(part.vertices, body.positionImpulse);
          Bounds.update(part.bounds, part.vertices, body.velocity);
          //assert(!Number.isNaN(part.position.x));
          part.position.x += body.positionImpulse.x;
          part.position.y += body.positionImpulse.y;
        }

        // move the body without changing velocity
        body.positionPrev.x += body.positionImpulse.x;
        //assert(!Number.isNaN(body.positionPrev.x), '1242');
        body.positionPrev.y += body.positionImpulse.y;

        if (Vector.dot(body.positionImpulse, body.velocity) < 0) {
          // reset cached impulse if the body has velocity along it
          body.positionImpulse.x = 0;
          body.positionImpulse.y = 0;
        } else {
          // warm the next iteration
          body.positionImpulse.x *= _positionWarming;
          body.positionImpulse.y *= _positionWarming;
        }
      }
    }
  }

  /**
   * Prepare pairs for velocity solving.
   * @method preSolveVelocity
   * @param {pair[]} pairs
   */
  public static preSolveVelocity(pairs: Pair[]) {
    var i,
      j,
      pair,
      contacts,
      collision,
      bodyA,
      bodyB,
      normal,
      tangent,
      contact,
      contactVertex,
      normalImpulse,
      tangentImpulse,
      offset,
      impulse = Vector._temp[0],
      tempA = Vector._temp[1];

    for (i = 0; i < pairs.length; i++) {
      pair = pairs[i];

      if (!pair.isActive || pair.isSensor)
        continue;

      contacts = pair.activeContacts;
      collision = pair.collision!;
      bodyA = collision.parentA;
      bodyB = collision.parentB;
      normal = collision.normal;
      tangent = collision.tangent;

      // resolve each contact
      for (j = 0; j < contacts.length; j++) {
        contact = contacts[j];
        contactVertex = contact.vertex;
        normalImpulse = contact.normalImpulse;
        tangentImpulse = contact.tangentImpulse;

        if (normalImpulse !== 0 || tangentImpulse !== 0) {
          // total impulse from contact
          impulse.x = (normal.x * normalImpulse) + (tangent.x * tangentImpulse);
          impulse.y = (normal.y * normalImpulse) + (tangent.y * tangentImpulse);

          // apply impulse from contact
          if (!(bodyA.isStatic || bodyA.isSleeping)) {
            offset = Vector.sub(contactVertex, bodyA.position, tempA);
            bodyA.positionPrev.x += impulse.x * bodyA.inverseMass;
            //assert(!Number.isNaN(bodyA.positionPrev.x), '1310');
            bodyA.positionPrev.y += impulse.y * bodyA.inverseMass;
            bodyA.anglePrev += Vector.cross(offset, impulse) * bodyA.inverseInertia;
          }

          if (!(bodyB.isStatic || bodyB.isSleeping)) {
            offset = Vector.sub(contactVertex, bodyB.position, tempA);
            bodyB.positionPrev.x -= impulse.x * bodyB.inverseMass;
            //assert(!Number.isNaN(bodyB.positionPrev.x), '1318');
            bodyB.positionPrev.y -= impulse.y * bodyB.inverseMass;
            bodyB.anglePrev -= Vector.cross(offset, impulse) * bodyB.inverseInertia;
          }
        }
      }
    }
  }

  /**
   * Find a solution for pair velocities.
   * @method solveVelocity
   * @param {pair[]} pairs
   * @param {number} timeScale
   */

  public static solveVelocity(pairs: Pair[], timeScale: number) {
    var timeScaleSquared = timeScale * timeScale,
      impulse = Vector._temp[0],
      tempA = Vector._temp[1],
      tempB = Vector._temp[2],
      tempC = Vector._temp[3],
      tempD = Vector._temp[4],
      tempE = Vector._temp[5];

    for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i];

      if (!pair.isActive || pair.isSensor)
        continue;

      var collision = pair.collision!,
        bodyA = collision.parentA,
        bodyB = collision.parentB,
        normal = collision.normal,
        tangent = collision.tangent,
        contacts = pair.activeContacts,
        contactShare = 1 / contacts.length;

      // update body velocities
      bodyA.velocity.x = bodyA.position.x - bodyA.positionPrev.x;
      bodyA.velocity.y = bodyA.position.y - bodyA.positionPrev.y;
      bodyB.velocity.x = bodyB.position.x - bodyB.positionPrev.x;
      bodyB.velocity.y = bodyB.position.y - bodyB.positionPrev.y;
      bodyA.angularVelocity = bodyA.angle - bodyA.anglePrev;
      bodyB.angularVelocity = bodyB.angle - bodyB.anglePrev;

      // resolve each contact
      for (var j = 0; j < contacts.length; j++) {
        var contact = contacts[j],
          contactVertex = contact.vertex,
          offsetA = Vector.sub(contactVertex, bodyA.position, tempA),
          offsetB = Vector.sub(contactVertex, bodyB.position, tempB),
          velocityPointA = Vector.add(bodyA.velocity, Vector.mult(Vector.perp(offsetA), bodyA.angularVelocity), tempC),
          velocityPointB = Vector.add(bodyB.velocity, Vector.mult(Vector.perp(offsetB), bodyB.angularVelocity), tempD),
          relativeVelocity = Vector.sub(velocityPointA, velocityPointB, tempE),
          normalVelocity = Vector.dot(normal, relativeVelocity);

        var tangentVelocity = Vector.dot(tangent, relativeVelocity),
          tangentSpeed = Math.abs(tangentVelocity),
          tangentVelocityDirection = Common.sign(tangentVelocity);

        // raw impulses
        var normalImpulse = (1 + pair.restitution) * normalVelocity,
          normalForce = Common.clamp(pair.separation + normalVelocity, 0, 1) * _frictionNormalMultiplier;

        // coulomb friction
        var tangentImpulse = tangentVelocity,
          maxFriction = Infinity;

        if (tangentSpeed > pair.friction * pair.frictionStatic * normalForce * timeScaleSquared) {
          maxFriction = tangentSpeed;
          tangentImpulse = Common.clamp(
            pair.friction * tangentVelocityDirection * timeScaleSquared,
            -maxFriction, maxFriction
          );
        }

        // modify impulses accounting for mass, inertia and offset
        var oAcN = Vector.cross(offsetA, normal),
          oBcN = Vector.cross(offsetB, normal),
          share = contactShare / (bodyA.inverseMass + bodyB.inverseMass + bodyA.inverseInertia * oAcN * oAcN + bodyB.inverseInertia * oBcN * oBcN);

        //console.log(`share=${share}, contactShare=${contactShare} oAcN=${oAcN}, oBcN=${oBcN}`);
        //console.log(`bodyA.inverseMass=${bodyA.inverseMass}, ${bodyA.inverseInertia}`);

        normalImpulse *= share;
        tangentImpulse *= share;

        // handle high velocity and resting collisions separately
        if (normalVelocity < 0 && normalVelocity * normalVelocity > _restingThresh * timeScaleSquared) {
          // high normal velocity so clear cached contact normal impulse
          contact.normalImpulse = 0;
        } else {
          // solve resting collision constraints using Erin Catto's method (GDC08)
          // impulse constraint tends to 0
          var contactNormalImpulse = contact.normalImpulse;
          contact.normalImpulse = Math.min(contact.normalImpulse + normalImpulse, 0);
          normalImpulse = contact.normalImpulse - contactNormalImpulse;
        }

        // handle high velocity and resting collisions separately
        if (tangentVelocity * tangentVelocity > _restingThreshTangent * timeScaleSquared) {
          // high tangent velocity so clear cached contact tangent impulse
          contact.tangentImpulse = 0;
        } else {
          // solve resting collision constraints using Erin Catto's method (GDC08)
          // tangent impulse tends to -tangentSpeed or +tangentSpeed
          var contactTangentImpulse = contact.tangentImpulse;
          contact.tangentImpulse = Common.clamp(contact.tangentImpulse + tangentImpulse, -maxFriction, maxFriction);
          tangentImpulse = contact.tangentImpulse - contactTangentImpulse;
        }

        // total impulse from contact

        impulse.x = (normal.x * normalImpulse) + (tangent.x * tangentImpulse);
        impulse.y = (normal.y * normalImpulse) + (tangent.y * tangentImpulse);

        // apply impulse from contact
        if (!(bodyA.isStatic || bodyA.isSleeping)) {
          bodyA.positionPrev.x += impulse.x * bodyA.inverseMass;
          bodyA.positionPrev.y += impulse.y * bodyA.inverseMass;
          bodyA.anglePrev += Vector.cross(offsetA, impulse) * bodyA.inverseInertia;
        }

        if (!(bodyB.isStatic || bodyB.isSleeping)) {
          bodyB.positionPrev.x -= impulse.x * bodyB.inverseMass;
          bodyB.positionPrev.y -= impulse.y * bodyB.inverseMass;
          bodyB.anglePrev -= Vector.cross(offsetB, impulse) * bodyB.inverseInertia;
        }
      }
    }
  }

}

