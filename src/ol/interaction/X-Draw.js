import flyd from 'flyd'
import { lazy } from './flyd'
import Circle from '../geom/Circle.js';
import EventType from '../events/EventType.js';
import Feature from '../Feature.js';
import InteractionProperty from './Property.js';
import LineString from '../geom/LineString.js';
import MapBrowserEvent from '../MapBrowserEvent.js';
import MapBrowserEventType from '../MapBrowserEventType.js';
import MultiLineString from '../geom/MultiLineString.js';
import MultiPoint from '../geom/MultiPoint.js';
import MultiPolygon from '../geom/MultiPolygon.js';
import Point from '../geom/Point.js';
import { PointerInteraction } from './X-Pointer.js';
import Polygon from '../geom/Polygon.js';
import VectorLayer from '../layer/Vector.js';
import VectorSource from '../source/Vector.js';
import {FALSE, TRUE} from '../functions.js';
import {
  always,
  never,
  noModifierKeys,
  shiftKeyOnly,
} from '../events/condition.js';
import { boundingExtent } from '../extent.js';
import {
  distance,
  squaredDistance as squaredCoordinateDistance,
} from '../coordinate.js';
import {fromUserCoordinate, getUserProjection} from '../proj.js';
import {getStrideForLayout} from '../geom/SimpleGeometry.js';
import { Active } from './Active'
import {
  getTraceTargets,
  getCoordinate,
  getTraceTargetUpdate,
  interpolateCoordinate,
  getMode,
  getDefaultStyleFunction
} from './Draw'

/**
 * @classdesc
 * Interaction for drawing feature geometries.
 *
 * @fires DrawEvent
 * @api
 */
export class Draw {

  /**
   * @param {Options} options Options.
   */
  constructor(options) {

    // Callbacks instead of events:
    const noop = () => {}
    this.drawstart_ = options.drawstart || noop
    this.drawend_ = options.drawend || noop
    this.drawabort_ = options.drawabort || noop

    // Composition over inheritance:
    this.pointer_ = new PointerInteraction({
      stopDown: FALSE,
      handleDownEvent: this.handleDownEvent.bind(this),
      handleUpEvent: this.handleUpEvent.bind(this)
    })

    // FIXME: ba548d93 - Remove interaction from map to deactive.
    // Get rid of Interactiob/BaseObject inheritance:
    this.active_ = new Active(true)

    /**
     * @type {boolean}
     * @private
     */
    this.shouldHandle_ = false;

    /**
     * @type {import("../pixel.js").Pixel}
     * @private
     */
    this.downPx_ = null;

    /**
     * @type {?}
     * @private
     */
    this.downTimeout_;

    /**
     * @type {number|undefined}
     * @private
     */
    this.lastDragTime_;

    /**
     * Pointer type of the last pointermove event
     * @type {string}
     * @private
     */
    this.pointerType_;

    /**
     * @type {boolean}
     * @private
     */
    this.freehand_ = false;

    /**
     * Target source for drawn features.
     * @type {VectorSource|null}
     * @private
     */
    this.source_ = options.source ? options.source : null;

    /**
     * Target collection for drawn features.
     * @type {import("../Collection.js").default<Feature>|null}
     * @private
     */
    this.features_ = options.features ? options.features : null;

    /**
     * Pixel distance for snapping.
     * @type {number}
     * @private
     */
    this.snapTolerance_ = options.snapTolerance ? options.snapTolerance : 12;

    /**
     * Geometry type.
     * @type {import("../geom/Geometry.js").Type}
     * @private
     */
    this.type_ = /** @type {import("../geom/Geometry.js").Type} */ (
      options.type
    );

    /**
     * Drawing mode (derived from geometry type.
     * @type {Mode}
     * @private
     */
    this.mode_ = getMode(this.type_);

    /**
     * Stop click, singleclick, and doubleclick events from firing during drawing.
     * Default is `false`.
     * @type {boolean}
     * @private
     */
    this.stopClick_ = !!options.stopClick;

    /**
     * The number of points that must be drawn before a polygon ring or line
     * string can be finished.  The default is 3 for polygon rings and 2 for
     * line strings.
     * @type {number}
     * @private
     */
    this.minPoints_ = options.minPoints
      ? options.minPoints
      : this.mode_ === 'Polygon'
      ? 3
      : 2;

    /**
     * The number of points that can be drawn before a polygon ring or line string
     * is finished. The default is no restriction.
     * @type {number}
     * @private
     */
    this.maxPoints_ =
      this.mode_ === 'Circle'
        ? 2
        : options.maxPoints
        ? options.maxPoints
        : Infinity;

    /**
     * A function to decide if a potential finish coordinate is permissible
     * @private
     * @type {import("../events/condition.js").Condition}
     */
    this.finishCondition_ = options.finishCondition
      ? options.finishCondition
      : TRUE;

    /**
     * @private
     * @type {import("../geom/Geometry.js").GeometryLayout}
     */
    this.geometryLayout_ = options.geometryLayout
      ? options.geometryLayout
      : 'XY';

    let geometryFunction = options.geometryFunction;
    if (!geometryFunction) {
      const mode = this.mode_;
      if (mode === 'Circle') {
        /**
         * @param {!LineCoordType} coordinates The coordinates.
         * @param {import("../geom/SimpleGeometry.js").default|undefined} geometry Optional geometry.
         * @param {import("../proj/Projection.js").default} projection The view projection.
         * @return {import("../geom/SimpleGeometry.js").default} A geometry.
         */
        geometryFunction = function (coordinates, geometry, projection) {
          const circle = geometry
            ? /** @type {Circle} */ (geometry)
            : new Circle([NaN, NaN]);
          const center = fromUserCoordinate(coordinates[0], projection);
          const squaredLength = squaredCoordinateDistance(
            center,
            fromUserCoordinate(coordinates[coordinates.length - 1], projection)
          );
          circle.setCenterAndRadius(
            center,
            Math.sqrt(squaredLength),
            this.geometryLayout_
          );
          const userProjection = getUserProjection();
          if (userProjection) {
            circle.transform(projection, userProjection);
          }
          return circle;
        };
      } else {
        let Constructor;
        if (mode === 'Point') {
          Constructor = Point;
        } else if (mode === 'LineString') {
          Constructor = LineString;
        } else if (mode === 'Polygon') {
          Constructor = Polygon;
        }
        /**
         * @param {!LineCoordType} coordinates The coordinates.
         * @param {import("../geom/SimpleGeometry.js").default|undefined} geometry Optional geometry.
         * @param {import("../proj/Projection.js").default} projection The view projection.
         * @return {import("../geom/SimpleGeometry.js").default} A geometry.
         */
        geometryFunction = function (coordinates, geometry, projection) {
          if (geometry) {
            if (mode === 'Polygon') {
              if (coordinates[0].length) {
                // Add a closing coordinate to match the first
                geometry.setCoordinates(
                  [coordinates[0].concat([coordinates[0][0]])],
                  this.geometryLayout_
                );
              } else {
                geometry.setCoordinates([], this.geometryLayout_);
              }
            } else {
              geometry.setCoordinates(coordinates, this.geometryLayout_);
            }
          } else {
            geometry = new Constructor(coordinates, this.geometryLayout_);
          }
          return geometry;
        };
      }
    }

    /**
     * @type {GeometryFunction}
     * @private
     */
    this.geometryFunction_ = geometryFunction;

    /**
     * @type {number}
     * @private
     */
    this.dragVertexDelay_ =
      options.dragVertexDelay !== undefined ? options.dragVertexDelay : 500;

    /**
     * Finish coordinate for the feature (first point for polygons, last point for
     * linestrings).
     * @type {import("../coordinate.js").Coordinate}
     * @private
     */
    this.finishCoordinate_ = null;

    /**
     * Sketch feature.
     * @type {Feature<import('../geom/SimpleGeometry.js').default>}
     * @private
     */
    this.sketchFeature_ = null;

    /**
     * Sketch point.
     * @type {Feature<Point>}
     * @private
     */
    this.sketchPoint_ = null;

    /**
     * Sketch coordinates. Used when drawing a line or polygon.
     * @type {SketchCoordType}
     * @private
     */
    this.sketchCoords_ = null;

    /**
     * Sketch line. Used when drawing polygon.
     * @type {Feature<LineString>}
     * @private
     */
    this.sketchLine_ = null;

    /**
     * Sketch line coordinates. Used when drawing a polygon or circle.
     * @type {LineCoordType}
     * @private
     */
    this.sketchLineCoords_ = null;

    /**
     * Squared tolerance for handling up events.  If the squared distance
     * between a down and up event is greater than this tolerance, up events
     * will not be handled.
     * @type {number}
     * @private
     */
    this.squaredClickTolerance_ = options.clickTolerance
      ? options.clickTolerance * options.clickTolerance
      : 36;

    /**
     * Draw overlay where our sketch features are drawn.
     * @type {VectorLayer}
     * @private
     */
    this.overlay_ = new VectorLayer({
      source: new VectorSource({
        useSpatialIndex: false,
        wrapX: options.wrapX ? options.wrapX : false,
      }),
      style: options.style ? options.style : getDefaultStyleFunction(),
      updateWhileInteracting: true,
    });

    /**
     * Name of the geometry attribute for newly created features.
     * @type {string|undefined}
     * @private
     */
    this.geometryName_ = options.geometryName;

    /**
     * @private
     * @type {import("../events/condition.js").Condition}
     */
    this.condition_ = options.condition ? options.condition : noModifierKeys;

    /**
     * @private
     * @type {import("../events/condition.js").Condition}
     */
    this.freehandCondition_;
    if (options.freehand) {
      this.freehandCondition_ = always;
    } else {
      this.freehandCondition_ = options.freehandCondition
        ? options.freehandCondition
        : shiftKeyOnly;
    }

    /**
     * @type {import("../events/condition.js").Condition}
     * @private
     */
    this.traceCondition_;
    this.setTrace(options.trace || false);

    /**
     * @type {TraceState}
     * @private
     */
    this.traceState_ = {active: false};

    /**
     * @type {VectorSource|null}
     * @private
     */
    this.traceSource_ = options.traceSource || options.source || null;

    this.$active = flyd.stream(true) // stream with initial value `true`

    // FIXME: 2100f0cc - Listener leak: clean-up on dispose (or similar); see also ba548d93
    this.active_.addChangeListener(InteractionProperty.ACTIVE, () => this.$active(this.getActive()));

    this.$map = flyd.stream()
    this.$view = flyd.combine(lazy($map => $map().getView()), [this.$map])
    this.$getCoordinateFromPixel = flyd.combine($map => $map().getCoordinateFromPixel.bind($map()), [this.$map])
    this.$getPixelFromCoordinate = flyd.combine($map => $map().getPixelFromCoordinate.bind($map()), [this.$map])
    this.$projection = flyd.combine($view => $view().getProjection(), [this.$view])

    // Optimization: Only update streams if values are (referentially) different:
    this.$uniqMap = flyd.combine(lazy($map => $map()), [this.$map])
    this.$uniqActive = flyd.combine(lazy($active => $active()), [this.$active])

    // Side-effect:
    flyd.combine(($map, $active) => {
      if (!$map() || !$active()) this.abortDrawing()      
      this.overlay_.setMap($active() ? $map() : null)
    }, [this.$uniqMap, this.$uniqActive])
  } // constructor

  getActive() {
    return this.active_.getActive()
  }

  setActive(value) {
    this.active_.setActive(value)
  }

  /**
   * Toggle tracing mode or set a tracing condition.
   *
   * @param {boolean|import("../events/condition.js").Condition} trace A boolean to toggle tracing mode or an event
   *     condition that will be checked when a feature is clicked to determine if tracing should be active.
   */
  setTrace(trace) {
    let condition;
    if (!trace) {
      condition = never;
    } else if (trace === true) {
      condition = always;
    } else {
      condition = trace;
    }
    this.traceCondition_ = condition;
  }

  /**
   * Get the overlay layer that this interaction renders sketch features to.
   * @return {VectorLayer} Overlay layer.
   * @api
   */
  getOverlay() {
    return this.overlay_;
  }

  handleEvent(event) {
    this.$map(event.map)

    if (event.originalEvent.type === EventType.CONTEXTMENU) {
      // Avoid context menu for long taps when drawing on mobile
      event.originalEvent.preventDefault();
    }
    this.freehand_ = this.mode_ !== 'Point' && this.freehandCondition_(event);
    let move = event.type === MapBrowserEventType.POINTERMOVE;
    let pass = true;
    if (
      !this.freehand_ &&
      this.lastDragTime_ &&
      event.type === MapBrowserEventType.POINTERDRAG
    ) {
      const now = Date.now();
      if (now - this.lastDragTime_ >= this.dragVertexDelay_) {
        this.downPx_ = event.pixel;
        this.shouldHandle_ = !this.freehand_;
        move = true;
      } else {
        this.lastDragTime_ = undefined;
      }
      if (this.shouldHandle_ && this.downTimeout_ !== undefined) {
        clearTimeout(this.downTimeout_);
        this.downTimeout_ = undefined;
      }
    }
    if (
      this.freehand_ &&
      event.type === MapBrowserEventType.POINTERDRAG &&
      this.sketchFeature_ !== null
    ) {
      this.addToDrawing_(event.coordinate);
      pass = false;
    } else if (
      this.freehand_ &&
      event.type === MapBrowserEventType.POINTERDOWN
    ) {
      pass = false;
    } else if (move && this.pointer_.getPointerCount() < 2) {
      pass = event.type === MapBrowserEventType.POINTERMOVE;
      if (pass && this.freehand_) {
        this.handlePointerMove_(event);
        if (this.shouldHandle_) {
          // Avoid page scrolling when freehand drawing on mobile
          event.originalEvent.preventDefault();
        }
      } else if (
        event.originalEvent.pointerType === 'mouse' ||
        (event.type === MapBrowserEventType.POINTERDRAG &&
          this.downTimeout_ === undefined)
      ) {
        this.handlePointerMove_(event);
      }
    } else if (event.type === MapBrowserEventType.DBLCLICK) {
      pass = false;
    }

    return this.pointer_.handleEvent(event) && pass;
  }

  /**
   * Handle pointer down events.
   * @param {import("../MapBrowserEvent.js").default} event Event.
   * @return {boolean} If the event was consumed.
   */
  handleDownEvent(event) {
    this.$map(event.map)
    this.shouldHandle_ = !this.freehand_;

    if (this.freehand_) {
      this.downPx_ = event.pixel;
      if (!this.finishCoordinate_) {
        this.startDrawing_(event.coordinate);
      }
      return true;
    }

    if (!this.condition_(event)) {
      this.lastDragTime_ = undefined;
      return false;
    }

    this.lastDragTime_ = Date.now();
    this.downTimeout_ = setTimeout(() => {
      this.handlePointerMove_(
        new MapBrowserEvent(
          MapBrowserEventType.POINTERMOVE,
          event.map,
          event.originalEvent,
          false,
          event.frameState
        )
      );
    }, this.dragVertexDelay_);
    this.downPx_ = event.pixel;
    return true;
  }

  /**
   * @private
   */
  deactivateTrace_() {
    this.traceState_ = {active: false};
  }

  /**
   * Activate or deactivate trace state based on a browser event.
   * @param {import("../MapBrowserEvent.js").default} event Event.
   * @private
   */
  toggleTraceState_(event) {
    if (!this.traceSource_ || !this.traceCondition_(event)) {
      return;
    }

    if (this.traceState_.active) {
      this.deactivateTrace_();
      return;
    }

    const lowerLeft = this.$getCoordinateFromPixel()([
      event.pixel[0] - this.snapTolerance_,
      event.pixel[1] + this.snapTolerance_,
    ]);
    const upperRight = this.$getCoordinateFromPixel()([
      event.pixel[0] + this.snapTolerance_,
      event.pixel[1] - this.snapTolerance_,
    ]);
    const extent = boundingExtent([lowerLeft, upperRight]);
    const features = this.traceSource_.getFeaturesInExtent(extent);
    if (features.length === 0) {
      return;
    }

    const targets = getTraceTargets(event.coordinate, features);
    if (targets.length) {
      this.traceState_ = {
        active: true,
        startPx: event.pixel.slice(),
        targets: targets,
        targetIndex: -1,
      };
    }
  }

  /**
   * @param {TraceTarget} target The trace target.
   * @param {number} endIndex The new end index of the trace.
   * @private
   */
  addOrRemoveTracedCoordinates_(target, endIndex) {
    // three cases to handle:
    //  1. traced in the same direction and points need adding
    //  2. traced in the same direction and points need removing
    //  3. traced in a new direction
    const previouslyForward = target.startIndex <= target.endIndex;
    const currentlyForward = target.startIndex <= endIndex;
    if (previouslyForward === currentlyForward) {
      // same direction
      if (
        (previouslyForward && endIndex > target.endIndex) ||
        (!previouslyForward && endIndex < target.endIndex)
      ) {
        // case 1 - add new points
        this.addTracedCoordinates_(target, target.endIndex, endIndex);
      } else if (
        (previouslyForward && endIndex < target.endIndex) ||
        (!previouslyForward && endIndex > target.endIndex)
      ) {
        // case 2 - remove old points
        this.removeTracedCoordinates_(endIndex, target.endIndex);
      }
    } else {
      // case 3 - remove old points, add new points
      this.removeTracedCoordinates_(target.startIndex, target.endIndex);
      this.addTracedCoordinates_(target, target.startIndex, endIndex);
    }
  }

  /**
   * @param {number} fromIndex The start index.
   * @param {number} toIndex The end index.
   * @private
   */
  removeTracedCoordinates_(fromIndex, toIndex) {
    if (fromIndex === toIndex) {
      return;
    }

    let remove = 0;
    if (fromIndex < toIndex) {
      const start = Math.ceil(fromIndex);
      let end = Math.floor(toIndex);
      if (end === toIndex) {
        end -= 1;
      }
      remove = end - start + 1;
    } else {
      const start = Math.floor(fromIndex);
      let end = Math.ceil(toIndex);
      if (end === toIndex) {
        end += 1;
      }
      remove = start - end + 1;
    }

    if (remove > 0) {
      this.removeLastPoints_(remove);
    }
  }

  /**
   * @param {TraceTarget} target The trace target.
   * @param {number} fromIndex The start index.
   * @param {number} toIndex The end index.
   * @private
   */
  addTracedCoordinates_(target, fromIndex, toIndex) {
    if (fromIndex === toIndex) {
      return;
    }

    const coordinates = [];
    if (fromIndex < toIndex) {
      // forward trace
      const start = Math.ceil(fromIndex);
      let end = Math.floor(toIndex);
      if (end === toIndex) {
        // if end is snapped to a vertex, it will be added later
        end -= 1;
      }
      for (let i = start; i <= end; ++i) {
        coordinates.push(getCoordinate(target.coordinates, i));
      }
    } else {
      // reverse trace
      const start = Math.floor(fromIndex);
      let end = Math.ceil(toIndex);
      if (end === toIndex) {
        end += 1;
      }
      for (let i = start; i >= end; --i) {
        coordinates.push(getCoordinate(target.coordinates, i));
      }
    }
    if (coordinates.length) {
      this.appendCoordinates(coordinates);
    }
  }

  /**
   * Update the trace.
   * @param {import("../MapBrowserEvent.js").default} event Event.
   * @private
   */
  updateTrace_(event) {
    const traceState = this.traceState_;
    if (!traceState.active) {
      return;
    }

    if (traceState.targetIndex === -1) {
      // check if we are ready to pick a target
      if (distance(traceState.startPx, event.pixel) < this.snapTolerance_) {
        return;
      }
    }

    const updatedTraceTarget = getTraceTargetUpdate(
      event.coordinate,
      traceState,
      this.$map(),
      this.snapTolerance_
    );

    if (traceState.targetIndex !== updatedTraceTarget.index) {
      // target changed
      if (traceState.targetIndex !== -1) {
        // remove points added during previous trace
        const oldTarget = traceState.targets[traceState.targetIndex];
        this.removeTracedCoordinates_(oldTarget.startIndex, oldTarget.endIndex);
      }
      // add points for the new target
      const newTarget = traceState.targets[updatedTraceTarget.index];
      this.addTracedCoordinates_(
        newTarget,
        newTarget.startIndex,
        updatedTraceTarget.endIndex
      );
    } else {
      // target stayed the same
      const target = traceState.targets[traceState.targetIndex];
      this.addOrRemoveTracedCoordinates_(target, updatedTraceTarget.endIndex);
    }

    // modify the state with updated info
    traceState.targetIndex = updatedTraceTarget.index;
    const target = traceState.targets[traceState.targetIndex];
    target.endIndex = updatedTraceTarget.endIndex;

    // update event coordinate and pixel to match end point of final segment
    const coordinate = interpolateCoordinate(
      target.coordinates,
      target.endIndex
    );

    const pixel = this.$getPixelFromCoordinate()(coordinate);
    event.coordinate = coordinate;
    event.pixel = [Math.round(pixel[0]), Math.round(pixel[1])];
  }

  /**
   * Handle pointer up events.
   * @param {import("../MapBrowserEvent.js").default} event Event.
   * @return {boolean} If the event was consumed.
   */
  handleUpEvent(event) {
    this.$map(event.map)
    let pass = true;

    if (this.pointer_.getPointerCount() === 0) {
      if (this.downTimeout_) {
        clearTimeout(this.downTimeout_);
        this.downTimeout_ = undefined;
      }

      this.handlePointerMove_(event);
      const tracing = this.traceState_.active;
      this.toggleTraceState_(event);

      if (this.shouldHandle_) {
        const startingToDraw = !this.finishCoordinate_;
        if (startingToDraw) {
          this.startDrawing_(event.coordinate);
        }
        if (!startingToDraw && this.freehand_) {
          this.finishDrawing();
        } else if (
          !this.freehand_ &&
          (!startingToDraw || this.mode_ === 'Point')
        ) {
          if (this.atFinish_(event.pixel, tracing)) {
            if (this.finishCondition_(event)) {
              this.finishDrawing();
            }
          } else {
            this.addToDrawing_(event.coordinate);
          }
        }
        pass = false;
      } else if (this.freehand_) {
        this.abortDrawing();
      }
    }

    if (!pass && this.stopClick_) {
      event.preventDefault();
    }
    return pass;
  }

  handlePointerMove_(event) {
    this.pointerType_ = event.originalEvent.pointerType;
    if (
      this.downPx_ &&
      ((!this.freehand_ && this.shouldHandle_) ||
        (this.freehand_ && !this.shouldHandle_))
    ) {
      const downPx = this.downPx_;
      const clickPx = event.pixel;
      const dx = downPx[0] - clickPx[0];
      const dy = downPx[1] - clickPx[1];
      const squaredDistance = dx * dx + dy * dy;
      this.shouldHandle_ = this.freehand_
        ? squaredDistance > this.squaredClickTolerance_
        : squaredDistance <= this.squaredClickTolerance_;
      if (!this.shouldHandle_) {
        return;
      }
    }

    if (!this.finishCoordinate_) {
      this.createOrUpdateSketchPoint_(event.coordinate.slice());
      return;
    }

    this.updateTrace_(event);
    this.modifyDrawing_(event.coordinate);
  }

  /**
   * Determine if an event is within the snapping tolerance of the start coord.
   * @param {import("../pixel.js").Pixel} pixel Pixel.
   * @param {boolean} [tracing] Drawing in trace mode (only stop if at the starting point).
   * @return {boolean} The event is within the snapping tolerance of the start.
   * @private
   */
  atFinish_(pixel, tracing) {
    let at = false;
    if (this.sketchFeature_) {
      let potentiallyDone = false;
      let potentiallyFinishCoordinates = [this.finishCoordinate_];
      const mode = this.mode_;
      if (mode === 'Point') {
        at = true;
      } else if (mode === 'Circle') {
        at = this.sketchCoords_.length === 2;
      } else if (mode === 'LineString') {
        potentiallyDone =
          !tracing && this.sketchCoords_.length > this.minPoints_;
      } else if (mode === 'Polygon') {
        const sketchCoords = /** @type {PolyCoordType} */ (this.sketchCoords_);
        potentiallyDone = sketchCoords[0].length > this.minPoints_;
        potentiallyFinishCoordinates = [
          sketchCoords[0][0],
          sketchCoords[0][sketchCoords[0].length - 2],
        ];
        if (tracing) {
          potentiallyFinishCoordinates = [sketchCoords[0][0]];
        } else {
          potentiallyFinishCoordinates = [
            sketchCoords[0][0],
            sketchCoords[0][sketchCoords[0].length - 2],
          ];
        }
      }
      if (potentiallyDone) {
        for (let i = 0, ii = potentiallyFinishCoordinates.length; i < ii; i++) {
          const finishCoordinate = potentiallyFinishCoordinates[i];
          const finishPixel = this.$getPixelFromCoordinate()(finishCoordinate);
          const dx = pixel[0] - finishPixel[0];
          const dy = pixel[1] - finishPixel[1];
          const snapTolerance = this.freehand_ ? 1 : this.snapTolerance_;
          at = Math.sqrt(dx * dx + dy * dy) <= snapTolerance;
          if (at) {
            this.finishCoordinate_ = finishCoordinate;
            break;
          }
        }
      }
    }
    return at;
  }

  /**
   * @param {import("../coordinate").Coordinate} coordinates Coordinate.
   * @private
   */
  createOrUpdateSketchPoint_(coordinates) {
    if (!this.sketchPoint_) {
      this.sketchPoint_ = new Feature(new Point(coordinates));
      this.updateSketchFeatures_();
    } else {
      const sketchPointGeom = this.sketchPoint_.getGeometry();
      sketchPointGeom.setCoordinates(coordinates);
    }
  }

  /**
   * @param {import("../geom/Polygon.js").default} geometry Polygon geometry.
   * @private
   */
  createOrUpdateCustomSketchLine_(geometry) {
    if (!this.sketchLine_) {
      this.sketchLine_ = new Feature();
    }
    const ring = geometry.getLinearRing(0);
    let sketchLineGeom = this.sketchLine_.getGeometry();
    if (!sketchLineGeom) {
      sketchLineGeom = new LineString(
        ring.getFlatCoordinates(),
        ring.getLayout()
      );
      this.sketchLine_.setGeometry(sketchLineGeom);
    } else {
      sketchLineGeom.setFlatCoordinates(
        ring.getLayout(),
        ring.getFlatCoordinates()
      );
      sketchLineGeom.changed();
    }
  }

  /**
   * Start the drawing.
   * @param {import("../coordinate.js").Coordinate} start Start coordinate.
   * @private
   */
  startDrawing_(start) {
    const stride = getStrideForLayout(this.geometryLayout_);
    while (start.length < stride) {
      start.push(0);
    }
    this.finishCoordinate_ = start;
    if (this.mode_ === 'Point') {
      this.sketchCoords_ = start.slice();
    } else if (this.mode_ === 'Polygon') {
      this.sketchCoords_ = [[start.slice(), start.slice()]];
      this.sketchLineCoords_ = this.sketchCoords_[0];
    } else {
      this.sketchCoords_ = [start.slice(), start.slice()];
    }
    if (this.sketchLineCoords_) {
      this.sketchLine_ = new Feature(new LineString(this.sketchLineCoords_));
    }
    const geometry = this.geometryFunction_(
      this.sketchCoords_,
      undefined,
      this.$projection()
    );
    this.sketchFeature_ = new Feature();
    if (this.geometryName_) {
      this.sketchFeature_.setGeometryName(this.geometryName_);
    }
    this.sketchFeature_.setGeometry(geometry);
    this.updateSketchFeatures_();
    this.drawstart_(this.sketchFeature_)
  }

  /**
   * Modify the drawing.
   * @param {import("../coordinate.js").Coordinate} coordinate Coordinate.
   * @private
   */
  modifyDrawing_(coordinate) {
    const geometry = this.sketchFeature_.getGeometry();
    const stride = getStrideForLayout(this.geometryLayout_);
    let coordinates, last;
    while (coordinate.length < stride) {
      coordinate.push(0);
    }
    if (this.mode_ === 'Point') {
      last = this.sketchCoords_;
    } else if (this.mode_ === 'Polygon') {
      coordinates = /** @type {PolyCoordType} */ (this.sketchCoords_)[0];
      last = coordinates[coordinates.length - 1];
      if (this.atFinish_(this.$getPixelFromCoordinate()(coordinate))) {
        // snap to finish
        coordinate = this.finishCoordinate_.slice();
      }
    } else {
      coordinates = this.sketchCoords_;
      last = coordinates[coordinates.length - 1];
    }
    last[0] = coordinate[0];
    last[1] = coordinate[1];
    this.geometryFunction_(
      /** @type {!LineCoordType} */ (this.sketchCoords_),
      geometry,
      this.$projection()
    );
    if (this.sketchPoint_) {
      const sketchPointGeom = this.sketchPoint_.getGeometry();
      sketchPointGeom.setCoordinates(coordinate);
    }
    if (geometry.getType() === 'Polygon' && this.mode_ !== 'Polygon') {
      this.createOrUpdateCustomSketchLine_(/** @type {Polygon} */ (geometry));
    } else if (this.sketchLineCoords_) {
      const sketchLineGeom = this.sketchLine_.getGeometry();
      sketchLineGeom.setCoordinates(this.sketchLineCoords_);
    }
    this.updateSketchFeatures_();
  }

  /**
   * Add a new coordinate to the drawing.
   * @param {!PointCoordType} coordinate Coordinate
   * @private
   */
  addToDrawing_(coordinate) {
    const geometry = this.sketchFeature_.getGeometry();
    let done;
    let coordinates;
    const mode = this.mode_;
    if (mode === 'LineString' || mode === 'Circle') {
      this.finishCoordinate_ = coordinate.slice();
      coordinates = /** @type {LineCoordType} */ (this.sketchCoords_);
      if (coordinates.length >= this.maxPoints_) {
        if (this.freehand_) {
          coordinates.pop();
        } else {
          done = true;
        }
      }
      coordinates.push(coordinate.slice());
      this.geometryFunction_(coordinates, geometry, this.$projection());
    } else if (mode === 'Polygon') {
      coordinates = /** @type {PolyCoordType} */ (this.sketchCoords_)[0];
      if (coordinates.length >= this.maxPoints_) {
        if (this.freehand_) {
          coordinates.pop();
        } else {
          done = true;
        }
      }
      coordinates.push(coordinate.slice());
      if (done) {
        this.finishCoordinate_ = coordinates[0];
      }
      this.geometryFunction_(this.sketchCoords_, geometry, this.$projection());
    }
    this.createOrUpdateSketchPoint_(coordinate.slice());
    this.updateSketchFeatures_();
    if (done) {
      this.finishDrawing();
    }
  }

  /**
   * @param {number} n The number of points to remove.
   */
  removeLastPoints_(n) {
    if (!this.sketchFeature_) {
      return;
    }
    const geometry = this.sketchFeature_.getGeometry();
    const mode = this.mode_;
    for (let i = 0; i < n; ++i) {
      let coordinates;
      if (mode === 'LineString' || mode === 'Circle') {
        coordinates = /** @type {LineCoordType} */ (this.sketchCoords_);
        coordinates.splice(-2, 1);
        if (coordinates.length >= 2) {
          this.finishCoordinate_ = coordinates[coordinates.length - 2].slice();
          const finishCoordinate = this.finishCoordinate_.slice();
          coordinates[coordinates.length - 1] = finishCoordinate;
          this.createOrUpdateSketchPoint_(finishCoordinate);
        }
        this.geometryFunction_(coordinates, geometry, this.$projection());
        if (geometry.getType() === 'Polygon' && this.sketchLine_) {
          this.createOrUpdateCustomSketchLine_(
            /** @type {Polygon} */ (geometry)
          );
        }
      } else if (mode === 'Polygon') {
        coordinates = /** @type {PolyCoordType} */ (this.sketchCoords_)[0];
        coordinates.splice(-2, 1);
        const sketchLineGeom = this.sketchLine_.getGeometry();
        if (coordinates.length >= 2) {
          const finishCoordinate = coordinates[coordinates.length - 2].slice();
          coordinates[coordinates.length - 1] = finishCoordinate;
          this.createOrUpdateSketchPoint_(finishCoordinate);
        }
        sketchLineGeom.setCoordinates(coordinates);
        this.geometryFunction_(this.sketchCoords_, geometry, this.$projection());
      }

      if (coordinates.length === 1) {
        this.abortDrawing();
        break;
      }
    }

    this.updateSketchFeatures_();
  }

  /**
   * Remove last point of the feature currently being drawn. Does not do anything when
   * drawing POINT or MULTI_POINT geometries.
   * @api
   */
  removeLastPoint() {
    this.removeLastPoints_(1);
  }

  /**
   * Stop drawing and add the sketch feature to the target layer.
   * The {@link module:ol/interaction/Draw~DrawEventType.DRAWEND} event is
   * dispatched before inserting the feature.
   * @api
   */
  finishDrawing() {
    const sketchFeature = this.abortDrawing_();
    if (!sketchFeature) {
      return;
    }
    let coordinates = this.sketchCoords_;
    const geometry = sketchFeature.getGeometry();
    if (this.mode_ === 'LineString') {
      // remove the redundant last point
      coordinates.pop();
      this.geometryFunction_(coordinates, geometry, this.$projection());
    } else if (this.mode_ === 'Polygon') {
      // remove the redundant last point in ring
      /** @type {PolyCoordType} */ (coordinates)[0].pop();
      this.geometryFunction_(coordinates, geometry, this.$projection());
      coordinates = geometry.getCoordinates();
    }

    // cast multi-part geometries
    if (this.type_ === 'MultiPoint') {
      sketchFeature.setGeometry(
        new MultiPoint([/** @type {PointCoordType} */ (coordinates)])
      );
    } else if (this.type_ === 'MultiLineString') {
      sketchFeature.setGeometry(
        new MultiLineString([/** @type {LineCoordType} */ (coordinates)])
      );
    } else if (this.type_ === 'MultiPolygon') {
      sketchFeature.setGeometry(
        new MultiPolygon([/** @type {PolyCoordType} */ (coordinates)])
      );
    }

    // First dispatch event to allow full set up of feature
    this.drawend_(sketchFeature)

    // Then insert feature
    if (this.features_) {
      this.features_.push(sketchFeature);
    }
    if (this.source_) {
      this.source_.addFeature(sketchFeature);
    }
  }

  /**
   * Stop drawing without adding the sketch feature to the target layer.
   * @return {Feature<import("../geom/SimpleGeometry.js").default>|null} The sketch feature (or null if none).
   * @private
   */
  abortDrawing_() {
    this.finishCoordinate_ = null;
    const sketchFeature = this.sketchFeature_;
    this.sketchFeature_ = null;
    this.sketchPoint_ = null;
    this.sketchLine_ = null;
    this.overlay_.getSource().clear(true);
    this.deactivateTrace_();
    return sketchFeature;
  }

  /**
   * Stop drawing without adding the sketch feature to the target layer.
   * @api
   */
  abortDrawing() {
    const sketchFeature = this.abortDrawing_();
    if (sketchFeature) {
      this.drawabort_(sketchFeature)
    }
  }

  /**
   * Append coordinates to the end of the geometry that is currently being drawn.
   * This can be used when drawing LineStrings or Polygons. Coordinates will
   * either be appended to the current LineString or the outer ring of the current
   * Polygon. If no geometry is being drawn, a new one will be created.
   * @param {!LineCoordType} coordinates Linear coordinates to be appended to
   * the coordinate array.
   * @api
   */
  appendCoordinates(coordinates) {
    const mode = this.mode_;
    const newDrawing = !this.sketchFeature_;
    if (newDrawing) {
      this.startDrawing_(coordinates[0]);
    }
    /** @type {LineCoordType} */
    let sketchCoords;
    if (mode === 'LineString' || mode === 'Circle') {
      sketchCoords = /** @type {LineCoordType} */ (this.sketchCoords_);
    } else if (mode === 'Polygon') {
      sketchCoords =
        this.sketchCoords_ && this.sketchCoords_.length
          ? /** @type {PolyCoordType} */ (this.sketchCoords_)[0]
          : [];
    } else {
      return;
    }

    if (newDrawing) {
      sketchCoords.shift();
    }

    // Remove last coordinate from sketch drawing (this coordinate follows cursor position)
    sketchCoords.pop();

    // Append coordinate list
    for (let i = 0; i < coordinates.length; i++) {
      this.addToDrawing_(coordinates[i]);
    }

    const ending = coordinates[coordinates.length - 1];
    // Duplicate last coordinate for sketch drawing (cursor position)
    this.addToDrawing_(ending);
    this.modifyDrawing_(ending);
  }

  /**
   * Initiate draw mode by starting from an existing geometry which will
   * receive new additional points. This only works on features with
   * `LineString` geometries, where the interaction will extend lines by adding
   * points to the end of the coordinates array.
   * This will change the original feature, instead of drawing a copy.
   *
   * The function will dispatch a `drawstart` event.
   *
   * @param {!Feature<LineString>} feature Feature to be extended.
   * @api
   */
  extend(feature) {
    const geometry = feature.getGeometry();
    const lineString = geometry;
    this.sketchFeature_ = feature;
    this.sketchCoords_ = lineString.getCoordinates();
    const last = this.sketchCoords_[this.sketchCoords_.length - 1];
    this.finishCoordinate_ = last.slice();
    this.sketchCoords_.push(last.slice());
    this.sketchPoint_ = new Feature(new Point(last));
    this.updateSketchFeatures_();
    this.drawstart_(this.sketchFeature_)
  }

  /**
   * Redraw the sketch features.
   * @private
   */
  updateSketchFeatures_() {
    const sketchFeatures = [];
    if (this.sketchFeature_) {
      sketchFeatures.push(this.sketchFeature_);
    }
    if (this.sketchLine_) {
      sketchFeatures.push(this.sketchLine_);
    }
    if (this.sketchPoint_) {
      sketchFeatures.push(this.sketchPoint_);
    }
    const overlaySource = this.overlay_.getSource();
    overlaySource.clear(true);
    overlaySource.addFeatures(sketchFeatures);
  }
}
