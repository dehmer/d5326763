import flyd from 'flyd'
import { skipRepeats } from './flyd'
import DragBox from './DragBox.js';
import {easeOut} from '../easing.js';
import {shiftKeyOnly} from '../events/condition.js';

/**
 * @typedef {Object} Options
 * @property {string} [className='ol-dragzoom'] CSS class name for styling the
 * box.
 * @property {import("../events/condition.js").Condition} [condition] A function that
 * takes an {@link module:ol/MapBrowserEvent~MapBrowserEvent} and returns a
 * boolean to indicate whether that event should be handled.
 * Default is {@link module:ol/events/condition.shiftKeyOnly}.
 * @property {number} [duration=200] Animation duration in milliseconds.
 * @property {boolean} [out=false] Use interaction for zooming out.
 * @property {number} [minArea=64] The minimum area of the box in pixel, this value is used by the parent default
 * `boxEndCondition` function.
 */

/**
 * @classdesc
 * Allows the user to zoom the map by clicking and dragging on the map,
 * normally combined with an {@link module:ol/events/condition} that limits
 * it to when a key, shift by default, is held down.
 *
 * To change the style of the box, use CSS and the `.ol-dragzoom` selector, or
 * your custom one configured with `className`.
 * @api
 */
class DragZoom extends DragBox {
  /**
   * @param {Options} [options] Options.
   */
  constructor(options) {
    options = options ? options : {};

    const condition = options.condition ? options.condition : shiftKeyOnly;

    super({
      condition: condition,
      className: options.className || 'ol-dragzoom',
      minArea: options.minArea,
    });

    /**
     * @private
     * @type {number}
     */
    this.duration_ = options.duration !== undefined ? options.duration : 200;

    /**
     * @private
     * @type {boolean}
     */
    this.out_ = options.out !== undefined ? options.out : false;

    this.$map = flyd.stream()
    this.$mapNoRepeats = flyd.combine(skipRepeats(), [this.$map])
    this.$view = flyd.combine($map => $map().getView(), [this.$mapNoRepeats])
    this.$rotatedExtentForGeometry = flyd.combine($view => $view().rotatedExtentForGeometry.bind($view()), [this.$view])
    this.$getResolutionForExtentInternal = flyd.combine($view => $view().getResolutionForExtentInternal.bind($view()), [this.$view])
    this.$getResolution = flyd.combine($view => $view().getResolution.bind($view()), [this.$view])
    this.$fitInternal = flyd.combine($view => $view().fitInternal.bind($view()), [this.$view])
  }

  /**
   * Function to execute just before `onboxend` is fired
   * @param {import("../MapBrowserEvent.js").default} mapBrowserEvent Event.
   */
  onBoxEnd(mapBrowserEvent) {
    this.$map(mapBrowserEvent.map)

    let geometry = this.getGeometry();

    if (this.out_) {
      const rotatedExtent = this.$rotatedExtentForGeometry()(geometry);
      const resolution = this.$getResolutionForExtentInternal()(rotatedExtent);
      const factor = this.$getResolution()() / resolution;
      geometry = geometry.clone();
      geometry.scale(factor * factor);
    }

    this.$fitInternal()(geometry, {
      duration: this.duration_,
      easing: easeOut,
    });
  }
}

export default DragZoom;
