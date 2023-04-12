import PointerInteraction, {
  centroid as centroidFromPointers,
} from './Pointer.js';
import {FALSE} from '../functions.js';
import {
  all,
  focusWithTabindex,
  noModifierKeys,
  primaryAction,
} from '../events/condition.js';
import {easeOut} from '../easing.js';
import {
  rotate as rotateCoordinate,
  scale as scaleCoordinate,
} from '../coordinate.js';
import { context } from './Interaction'


/**
 * @classdesc
 * Allows the user to pan the map by dragging the map.
 * @api
 */
class DragPan {
  /**
   * @param {Options} [options] Options.
   */
  constructor(options) {
    options = options ? options : {};

    // Composition over inheritance:
    this.pointer_ = new PointerInteraction({
      stopDown: FALSE,
      handleDownEvent: this.handleDownEvent.bind(this),
      handleUpEvent: this.handleUpEvent.bind(this),
      handleDragEvent: this.handleDragEvent.bind(this)
    })

    /**
     * @private
     * @type {import("../Kinetic.js").default|undefined}
     */
    this.kinetic_ = options.kinetic;

    /**
     * @type {import("../pixel.js").Pixel}
     */
    this.lastCentroid = null;

    /**
     * @type {number}
     */
    this.lastPointersCount_;

    /**
     * @type {boolean}
     */
    this.panning_ = false;

    const condition = options.condition
      ? options.condition
      : all(noModifierKeys, primaryAction);

    /**
     * @private
     * @type {import("../events/condition.js").Condition}
     */
    this.condition_ = options.onFocusOnly
      ? all(focusWithTabindex, condition)
      : condition;

    /**
     * @private
     * @type {boolean}
     */
    this.noKinetic_ = false;

    this.context = context()
  }

  handleEvent(mapBrowserEvent) {
    const map = mapBrowserEvent ? mapBrowserEvent.map : null
    this.context.setMap(map)
    if (!map) return false
    return this.pointer_.handleEvent(mapBrowserEvent)
  }

  /**
   * Handle pointer drag events.
   * @param {import("../MapBrowserEvent.js").default} mapBrowserEvent Event.
   */
  handleDragEvent(mapBrowserEvent) {
    if (!this.panning_) {
      this.panning_ = true;
      this.context.beginInteraction();
    }

    const targetPointers = this.pointer_.targetPointers;
    const centroid = this.context.eventPixel(centroidFromPointers(targetPointers));
    if (targetPointers.length == this.lastPointersCount_) {
      if (this.kinetic_) {
        this.kinetic_.update(centroid[0], centroid[1]);
      }

      if (this.lastCentroid) {
        const delta = [
          this.lastCentroid[0] - centroid[0],
          centroid[1] - this.lastCentroid[1],
        ];

        scaleCoordinate(delta, this.context.resolution());
        rotateCoordinate(delta, this.context.rotation());
        this.context.adjustCenterInternal(delta);
      }
    } else if (this.kinetic_) {
      // reset so we don't overestimate the kinetic energy after
      // after one finger down, tiny drag, second finger down
      this.kinetic_.begin();
    }
    this.lastCentroid = centroid;
    this.lastPointersCount_ = targetPointers.length;
    mapBrowserEvent.originalEvent.preventDefault();
  }

  /**
   * Handle pointer up events.
   * @param {import("../MapBrowserEvent.js").default} mapBrowserEvent Event.
   * @return {boolean} If the event was consumed.
   */
  handleUpEvent(mapBrowserEvent) {
    if (this.pointer_.targetPointers.length === 0) {
      if (!this.noKinetic_ && this.kinetic_ && this.kinetic_.end()) {
        const distance = this.kinetic_.getDistance();
        const angle = this.kinetic_.getAngle();
        const center = this.context.centerInternal();
        const centerpx = this.context.pixelFromCoordinateInternal(center);
        const dest = this.context.coordinateFromPixelInternal([
          centerpx[0] - distance * Math.cos(angle),
          centerpx[1] - distance * Math.sin(angle),
        ]);

        this.context.animateInternal({
          center: this.context.constrainedCenter(dest),
          duration: 500,
          easing: easeOut,
        });
      }
      if (this.panning_) {
        this.panning_ = false;
        this.context.endInteraction();
      }

      return false;
    }

    if (this.kinetic_) {
      // reset so we don't overestimate the kinetic energy after
      // after one finger up, tiny drag, second finger up
      this.kinetic_.begin();
    }

    this.lastCentroid = null;
    return true;
  }

  /**
   * Handle pointer down events.
   * @param {import("../MapBrowserEvent.js").default} mapBrowserEvent Event.
   * @return {boolean} If the event was consumed.
   */
  handleDownEvent(mapBrowserEvent) {
    if (this.pointer_.targetPointers.length > 0 && this.condition_(mapBrowserEvent)) {
      this.lastCentroid = null;
      // stop any current animation
      if (this.context.animating()) {
        this.context.cancelAnimations();
      }
      if (this.kinetic_) {
        this.kinetic_.begin();
      }
      // No kinetic as soon as more than one pointer on the screen is
      // detected. This is to prevent nasty pans after pinch.
      this.noKinetic_ = this.pointer_.targetPointers.length > 1;
      return true;
    }
    return false;
  }
}

export default DragPan;
