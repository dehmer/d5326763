/**
 * @module ol/interaction/KeyboardZoom
 */
import EventType from '../events/EventType.js';
import { zoomByDelta } from './Interaction.js';
import {targetNotEditable} from '../events/condition.js';
import { context } from './Interaction'

/**
 * @typedef {Object} Options
 * @property {number} [duration=100] Animation duration in milliseconds.
 * @property {import("../events/condition.js").Condition} [condition] A function that
 * takes an {@link module:ol/MapBrowserEvent~MapBrowserEvent} and returns a
 * boolean to indicate whether that event should be handled. Default is
 * {@link module:ol/events/condition.targetNotEditable}.
 * @property {number} [delta=1] The zoom level delta on each key press.
 */

/**
 * @classdesc
 * Allows the user to zoom the map using keyboard + and -.
 * Note that, although this interaction is by default included in maps,
 * the keys can only be used when browser focus is on the element to which
 * the keyboard events are attached. By default, this is the map div,
 * though you can change this with the `keyboardEventTarget` in
 * {@link module:ol/Map~Map}. `document` never loses focus but, for any other
 * element, focus will have to be on, and returned to, this element if the keys
 * are to function.
 * See also {@link module:ol/interaction/KeyboardPan~KeyboardPan}.
 * @api
 */
class KeyboardZoom {

  /**
   * @param {Options} [options] Options.
   */
  constructor(options) {
    options = options ? options : {};
    this.context = context()

    /**
     * @private
     * @type {import("../events/condition.js").Condition}
     */
    this.condition_ = options.condition ? options.condition : targetNotEditable;

    /**
     * @private
     * @type {number}
     */
    this.delta_ = options.delta ? options.delta : 1;

    /**
     * @private
     * @type {number}
     */
    this.duration_ = options.duration !== undefined ? options.duration : 100;
  }

  /**
   * Handles the {@link module:ol/MapBrowserEvent~MapBrowserEvent map browser event} if it was a
   * `KeyEvent`, and decides whether to zoom in or out (depending on whether the
   * key pressed was '+' or '-').
   * @param {import("../MapBrowserEvent.js").default} mapBrowserEvent Map browser event.
   * @return {boolean} `false` to stop event propagation.
   */
  handleEvent(mapBrowserEvent) {
    const map = mapBrowserEvent ? mapBrowserEvent.map : null
    this.context.setMap(map)
    if (!map) return false

    let stopEvent = false;
    if (
      mapBrowserEvent.type == EventType.KEYDOWN ||
      mapBrowserEvent.type == EventType.KEYPRESS
    ) {
      const keyEvent = /** @type {KeyboardEvent} */ (
        mapBrowserEvent.originalEvent
      );
      const key = keyEvent.key;
      if (this.condition_(mapBrowserEvent) && (key === '+' || key === '-')) {
        const delta = key === '+' ? this.delta_ : -this.delta_;
        zoomByDelta(this.context, delta, undefined, this.duration_);
        keyEvent.preventDefault();
        stopEvent = true;
      }
    }
    return !stopEvent;
  }
}

export default KeyboardZoom;
