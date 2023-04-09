import flyd from 'flyd'
import Interaction, {zoomByDelta} from './Interaction.js';
import MapBrowserEventType from '../MapBrowserEventType.js';

/**
 * @typedef {Object} Options
 * @property {number} [duration=250] Animation duration in milliseconds.
 * @property {number} [delta=1] The zoom delta applied on each double click.
 */

/**
 * @classdesc
 * Allows the user to zoom by double-clicking on the map.
 * @api
 */
class DoubleClickZoom extends Interaction {
  /**
   * @param {Options} [options] Options.
   */
  constructor(options) {
    super();

    options = options ? options : {};

    /**
     * @private
     * @type {number}
     */
    this.delta_ = options.delta ? options.delta : 1;

    /**
     * @private
     * @type {number}
     */
    this.duration_ = options.duration !== undefined ? options.duration : 250;

    this.$map = flyd.stream()
    this.$view = flyd.combine($map => $map().getView(), [this.$map])
  }

  handleEvent(mapBrowserEvent) {
    this.$map(mapBrowserEvent.map)

    let stopEvent = false;
    if (mapBrowserEvent.type == MapBrowserEventType.DBLCLICK) {
      const browserEvent = /** @type {MouseEvent} */ (
        mapBrowserEvent.originalEvent
      );
      const anchor = mapBrowserEvent.coordinate;
      const delta = browserEvent.shiftKey ? -this.delta_ : this.delta_;
      zoomByDelta(this.$view(), delta, anchor, this.duration_);
      browserEvent.preventDefault();
      stopEvent = true;
    }
    return !stopEvent;
  }
}

export default DoubleClickZoom;
