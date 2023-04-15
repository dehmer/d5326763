/**
 * @module ol/interaction/Interaction
 */
import BaseObject from '../Object.js';
import InteractionProperty from './Property.js';
import {easeOut, linear} from '../easing.js';

/***
 * @template Return
 * @typedef {import("../Observable").OnSignature<import("../Observable").EventTypes, import("../events/Event.js").default, Return> &
 *   import("../Observable").OnSignature<import("../ObjectEventType").Types|
 *     'change:active', import("../Object").ObjectEvent, Return> &
 *   import("../Observable").CombinedOnSignature<import("../Observable").EventTypes|import("../ObjectEventType").Types|
 *     'change:active', Return>} InteractionOnSignature
 */

/**
 * Object literal with config options for interactions.
 * @typedef {Object} InteractionOptions
 * @property {function(import("../MapBrowserEvent.js").default):boolean} handleEvent
 * Method called by the map to notify the interaction that a browser event was
 * dispatched to the map. If the function returns a falsy value, propagation of
 * the event to other interactions in the map's interactions chain will be
 * prevented (this includes functions with no explicit return). The interactions
 * are traversed in reverse order of the interactions collection of the map.
 */

/**
 * @classdesc
 * Abstract base class; normally only used for creating subclasses and not
 * instantiated in apps.
 * User actions that change the state of the map. Some are similar to controls,
 * but are not associated with a DOM element.
 * For example, {@link module:ol/interaction/KeyboardZoom~KeyboardZoom} is
 * functionally the same as {@link module:ol/control/Zoom~Zoom}, but triggered
 * by a keyboard event not a button element event.
 * Although interactions do not have a DOM element, some of them do render
 * vectors and so are visible on the screen.
 * 
 * Implemented by
 * @type {<import("./DoubleClickZoom.js")} - getView()
 * @type {<import("./DragAndDrop.js")} - getView(), getViewport()
 * @type {<import("./KeyboardPan.js")} - getView()
 * @type {<import("./KeyboardZoom.js")} - getView()
 * @type {<import("./Link.js")} - getLayerGroup(), getView(), getAllLayers()
 * @type {<import("./MouseWheelZoom.js")} - getView()
 * @type {<import("./Select.js")} - forEachFeatureAtPixel()
 * @type {<import("./Pointer.js")}
 *    @type {<import("./DragBox.js")} - getOverlayContainer(), getCoordinateFromPixelInternal()
 *    @type {<import("./DragPan.js")} - getView(), getEventPixel(), getPixelFromCoordinateInternal()
 *    @type {<import("./DragRotateAndZoom.js")} - getSize(), getView()
 *    @type {<import("./DragRotate.js")} - getSize(), getView()
 *    @type {<import("./Draw.js")} - getPixelFromCoordinate(), getCoordinateFromPixel(), getView(), render()
 *    @type {<import("./Extent.js")} - getCoordinateFromPixelInternal(), render()
 *    @type {<import("./Modify.js")} - isRendered(), getView(), getCoordinateFromPixel(), getPixelFromCoordinate(), forEachFeatureAtPixel(), render()
 *    @type {<import("./PinchRotate.js")} - getView(), getCoordinateFromPixelInternal(), render()
 *    @type {<import("./PinchZoom.js")} - getView(), getCoordinateFromPixelInternal(), render()
 *    @type {<import("./Snap.js")} - getView(), getPixelFromCoordinate()
 *    @type {<import("./Translate.js")} - getViewport(), forEachFeatureAtPixel()
 * 
 * @api
 */
class Interaction extends BaseObject {
  /**
   * @param {InteractionOptions} [options] Options.
   */
  constructor(options) {
    super();

    if (options && options.handleEvent) {
      this.handleEvent = options.handleEvent;
    }

    /**
     * @private
     * @type {import("../Map.js").default|null}
     */
    this.map_ = null;

    this.setActive(true);
  }

  /**
   * Return whether the interaction is currently active.
   * @return {boolean} `true` if the interaction is active, `false` otherwise.
   * @observable
   * @api
   */
  getActive() {
    return /** @type {boolean} */ (this.get(InteractionProperty.ACTIVE));
  }

  /**
   * Get the map associated with this interaction.
   * @return {import("../Map.js").default|null} Map.
   * @api
   */
  getMap() {
    return this.map_;
  }

  /**
   * Handles the {@link module:ol/MapBrowserEvent~MapBrowserEvent map browser event}.
   * @param {import("../MapBrowserEvent.js").default} mapBrowserEvent Map browser event.
   * @return {boolean} `false` to stop event propagation.
   * @api
   */
  handleEvent(mapBrowserEvent) {
    return true;
  }

  /**
   * Activate or deactivate the interaction.
   * @param {boolean} active Active.
   * @observable
   * @api
   */
  setActive(active) {
    this.set(InteractionProperty.ACTIVE, active);
  }

  /**
   * Remove the interaction from its current map and attach it to the new map.
   * Subclasses may set up event handlers to get notified about changes to
   * the map here.
   * @param {import("../Map.js").default|null} map Map.
   */
  setMap(map) {
    this.map_ = map;
  }
}

/**
 * @param {import("../View.js").default} view View.
 * @param {import("../coordinate.js").Coordinate} delta Delta.
 * @param {number} [duration] Duration.
 */
export function pan(view, delta, duration) {
  const currentCenter = view.getCenterInternal();
  if (currentCenter) {
    const center = [currentCenter[0] + delta[0], currentCenter[1] + delta[1]];
    view.animateInternal({
      duration: duration !== undefined ? duration : 250,
      easing: linear,
      center: view.getConstrainedCenter(center),
    });
  }
}

export function zoomByDelta(context, delta, anchor, duration) {
  const currentZoom = context.zoom();

  if (currentZoom === undefined) {
    return;
  }

  const newZoom = context.constrainedZoom(currentZoom + delta);
  const newResolution = context.resolutionForZoom(newZoom);

  if (context.animating()) {
    context.cancelAnimations();
  }
  context.animate({
    resolution: newResolution,
    anchor: anchor,
    duration: duration !== undefined ? duration : 250,
    easing: easeOut,
  });
}

export const context = (options = {}) => {
  let map
  let view

  if (options.map) {
    map = options.map
    view = map.getView()
  }

  const dispose = options.dispose || (() => {})
  const initialize = options.initialize || (() => {})

  const setMap = aMap => {
    if (map && !aMap) dispose()
    else if (!map && aMap) initialize(aMap)
    map = aMap
    view = map ? map.getView() : null
  }

  // Interaction-private map/view interface. 
  
  return {
    map,
    setMap,
    initialized: () => !!map,    
    rendered: () => map.isRendered(),
    coordinateFromPixel: pixel => map.getCoordinateFromPixel(pixel),
    coordinateFromPixelInternal: pixel => map.getCoordinateFromPixelInternal(pixel),
    pixelFromCoordinate: coordinate => map.getPixelFromCoordinate(coordinate),
    pixelFromCoordinateInternal: coordinate => map.getPixelFromCoordinateInternal(coordinate),
    eventPixel: event => map.getEventPixel(event),
    forEachFeatureAtPixel: (pixel, callback, options) => map.forEachFeatureAtPixel(pixel, callback, options),
    interacting: () => view.getInteracting(),
    projection: () => view.getProjection(),
    resolution: () => view.getResolution(),
    resolutionForZoom: zoom => view.getResolutionForZoom(zoom),
    zoom: () => view.getZoom(),
    constrainResolution: () => view.getConstrainResolution(),
    constrainedZoom: (targetZoom, direction) => view.getConstrainedZoom(targetZoom, direction),
    rotation: () => view.getRotation(),
    beginInteraction: () => view.beginInteraction(),
    endInteraction: () => view.endInteraction(),
    animate: options => view.animate(options),
    animateInternal: options => view.animateInternal(options),
    animating: () => view.getAnimating(),
    cancelAnimations: () => view.cancelAnimations(),
    centerInternal: () => view.getCenterInternal(),
    adjustCenterInternal: delta => view.adjustCenterInternal(delta),
    constrainedCenter: coordinate => view.getConstrainedCenter(coordinate),
    adjustZoom: (delta, anchor) => view.adjustZoom(delta, anchor)
  }
}

export default Interaction;
