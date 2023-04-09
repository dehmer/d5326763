import flyd from 'flyd'
import { lazy } from './flyd'
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
    this.$view = flyd.combine(lazy($map => $map().getView()), [this.$map])
    this.$getEventPixel = flyd.combine($map => $map().getEventPixel.bind($map()), [this.$map])
    this.$getPixelFromCoordinateInternal = flyd.combine($map => $map().getPixelFromCoordinateInternal.bind($map()), [this.$map])
    this.$getCoordinateFromPixelInternal = flyd.combine($map => $map().getCoordinateFromPixelInternal.bind($map()), [this.$map])
    this.$beginInteraction = flyd.combine($view => $view().beginInteraction.bind($view()), [this.$view])
    this.$endInteraction = flyd.combine($view => $view().endInteraction.bind($view()), [this.$view])
    this.$getResolution = flyd.combine($view => $view().getResolution.bind($view()), [this.$view])
    this.$getRotation = flyd.combine($view => $view().getRotation.bind($view()), [this.$view])
    this.$adjustCenterInternal = flyd.combine($view => $view().adjustCenterInternal.bind($view()), [this.$view])
    this.$getCenterInternal = flyd.combine($view => $view().getCenterInternal.bind($view()), [this.$view])
    this.$animateInternal = flyd.combine($view => $view().animateInternal.bind($view()), [this.$view])
    this.$getConstrainedCenter = flyd.combine($view => $view().getConstrainedCenter.bind($view()), [this.$view])
    this.$getAnimating = flyd.combine($view => $view().getAnimating.bind($view()), [this.$view])
    this.$cancelAnimations = flyd.combine($view => $view().cancelAnimations.bind($view()), [this.$view])
  }

  /**
   * Handle pointer drag events.
   * @param {import("../MapBrowserEvent.js").default} mapBrowserEvent Event.
   */
  handleDragEvent(mapBrowserEvent) {
    this.$map(mapBrowserEvent.map)

    if (!this.panning_) {
      this.panning_ = true;
      this.$beginInteraction();
    }

    const targetPointers = this.targetPointers;
    const centroid = this.$getEventPixel()(centroidFromPointers(targetPointers));
    if (targetPointers.length == this.lastPointersCount_) {
      if (this.kinetic_) {
        this.kinetic_.update(centroid[0], centroid[1]);
      }

      if (this.lastCentroid) {
        const delta = [
          this.lastCentroid[0] - centroid[0],
          centroid[1] - this.lastCentroid[1],
        ];

        scaleCoordinate(delta, this.$getResolution()());
        rotateCoordinate(delta, this.$getRotation()());
        this.$adjustCenterInternal()(delta);
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
        const center = this.$getCenterInternal()();
        const centerpx = this.$getPixelFromCoordinateInternal()(center);
        const dest = this.$getCoordinateFromPixelInternal()([
          centerpx[0] - distance * Math.cos(angle),
          centerpx[1] - distance * Math.sin(angle),
        ]);

        this.$animateInternal()({
          center: this.$getConstrainedCenter()(dest),
          duration: 500,
          easing: easeOut,
        });
      }
      if (this.panning_) {
        this.panning_ = false;
        this.$endInteraction()();
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
      if (this.$getAnimating()()) {
        this.$cancelAnimations()();
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
