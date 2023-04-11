import flyd from 'flyd'
import { skipRepeats, nullable } from './flyd'
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


/**
 * @classdesc
 * Allows the user to pan the map by dragging the map.
 * @api
 */
class DragPan extends PointerInteraction {
  /**
   * @param {Options} [options] Options.
   */
  constructor(options) {
    super({
      stopDown: FALSE,
    });

    options = options ? options : {};

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

    this.$map = flyd.stream()
    this.$mapNoRepeats = flyd.combine(skipRepeats(), [this.$map])
    this.$view = flyd.combine(nullable($map => $map().getView()), [this.$mapNoRepeats])
  }

  /**
   * Handle pointer drag events.
   * @param {import("../MapBrowserEvent.js").default} mapBrowserEvent Event.
   */
  handleDragEvent(mapBrowserEvent) {
    this.$map(mapBrowserEvent.map)

    if (!this.panning_) {
      this.panning_ = true;
      this.$view().beginInteraction();
    }

    const targetPointers = this.targetPointers;
    const centroid = this.$map().getEventPixel(centroidFromPointers(targetPointers));
    if (targetPointers.length == this.lastPointersCount_) {
      if (this.kinetic_) {
        this.kinetic_.update(centroid[0], centroid[1]);
      }

      if (this.lastCentroid) {
        const delta = [
          this.lastCentroid[0] - centroid[0],
          centroid[1] - this.lastCentroid[1],
        ];

        scaleCoordinate(delta, this.$view().getResolution());
        rotateCoordinate(delta, this.$view().getRotation());
        this.$view().adjustCenterInternal(delta);
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
    this.$map(mapBrowserEvent.map)

    if (this.targetPointers.length === 0) {
      if (!this.noKinetic_ && this.kinetic_ && this.kinetic_.end()) {
        const distance = this.kinetic_.getDistance();
        const angle = this.kinetic_.getAngle();
        const center = this.$view().getCenterInternal();
        const centerpx = this.$map().getPixelFromCoordinateInternal(center);
        const dest = this.$map().getCoordinateFromPixelInternal([
          centerpx[0] - distance * Math.cos(angle),
          centerpx[1] - distance * Math.sin(angle),
        ]);

        this.$view().animateInternal({
          center: this.$view().getConstrainedCenter(dest),
          duration: 500,
          easing: easeOut,
        });
      }
      if (this.panning_) {
        this.panning_ = false;
        this.$view().endInteraction();
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
    this.$map(mapBrowserEvent.map)

    if (this.targetPointers.length > 0 && this.condition_(mapBrowserEvent)) {
      this.lastCentroid = null;
      // stop any current animation
      if (this.$view().getAnimating()) {
        this.$view().cancelAnimations();
      }
      if (this.kinetic_) {
        this.kinetic_.begin();
      }
      // No kinetic as soon as more than one pointer on the screen is
      // detected. This is to prevent nasty pans after pinch.
      this.noKinetic_ = this.targetPointers.length > 1;
      return true;
    }
    return false;
  }
}

export default DragPan;
