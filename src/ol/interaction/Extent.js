/**
 * @module ol/interaction/Extent
 */
import Event from '../events/Event.js';
import Feature from '../Feature.js';
import MapBrowserEventType from '../MapBrowserEventType.js';
import Point from '../geom/Point.js';
import PointerInteraction from './Pointer.js';
import VectorLayer from '../layer/Vector.js';
import VectorSource from '../source/Vector.js';
import {always} from '../events/condition.js';
import {boundingExtent, getArea} from '../extent.js';
import {
  closestOnSegment,
  distance as coordinateDistance,
  squaredDistance as squaredCoordinateDistance,
  squaredDistanceToSegment,
} from '../coordinate.js';
import {createEditingStyle} from '../style/Style.js';
import {fromExtent as polygonFromExtent} from '../geom/Polygon.js';
import {toUserExtent} from '../proj.js';

/**
 * @enum {string}
 */
const ExtentEventType = {
  /**
   * Triggered after the extent is changed
   * @event ExtentEvent#extentchanged
   * @api
   */
  EXTENTCHANGED: 'extentchanged',
};

export class ExtentEvent extends Event {
  /**
   * @param {import("../extent.js").Extent} extent the new extent
   */
  constructor(extent) {
    super(ExtentEventType.EXTENTCHANGED);
    this.extent = extent;
  }
}

class Extent extends PointerInteraction {
  constructor(options) {
    options = options || {};

    super(options);

    this.condition_ = options.condition ? options.condition : always;
    this.extent_ = null;
    this.pointerHandler_ = null;
    this.pixelTolerance_ =
      options.pixelTolerance !== undefined ? options.pixelTolerance : 10;

    this.snappedToVertex_ = false;
    this.extentFeature_ = null;
    this.vertexFeature_ = null;

    if (!options) {
      options = {};
    }

    this.extentOverlay_ = new VectorLayer({
      source: new VectorSource({
        useSpatialIndex: false,
        wrapX: !!options.wrapX,
      }),
      style: options.boxStyle
        ? options.boxStyle
        : getDefaultExtentStyleFunction(),
      updateWhileAnimating: true,
      updateWhileInteracting: true,
    });

    this.vertexOverlay_ = new VectorLayer({
      source: new VectorSource({
        useSpatialIndex: false,
        wrapX: !!options.wrapX,
      }),
      style: options.pointerStyle
        ? options.pointerStyle
        : getDefaultPointerStyleFunction(),
      updateWhileAnimating: true,
      updateWhileInteracting: true,
    });

    if (options.extent) {
      this.setExtent(options.extent);
    }
  }

  snapToVertex_(pixel, map) {
    const pixelCoordinate = map.getCoordinateFromPixelInternal(pixel);
    const sortByDistance = function (a, b) {
      return (
        squaredDistanceToSegment(pixelCoordinate, a) -
        squaredDistanceToSegment(pixelCoordinate, b)
      );
    };
    const extent = this.getExtentInternal();
    if (extent) {
      //convert extents to line segments and find the segment closest to pixelCoordinate
      const segments = getSegments(extent);
      segments.sort(sortByDistance);
      const closestSegment = segments[0];

      let vertex = closestOnSegment(pixelCoordinate, closestSegment);
      const vertexPixel = map.getPixelFromCoordinateInternal(vertex);

      //if the distance is within tolerance, snap to the segment
      if (coordinateDistance(pixel, vertexPixel) <= this.pixelTolerance_) {
        //test if we should further snap to a vertex
        const pixel1 = map.getPixelFromCoordinateInternal(closestSegment[0]);
        const pixel2 = map.getPixelFromCoordinateInternal(closestSegment[1]);
        const squaredDist1 = squaredCoordinateDistance(vertexPixel, pixel1);
        const squaredDist2 = squaredCoordinateDistance(vertexPixel, pixel2);
        const dist = Math.sqrt(Math.min(squaredDist1, squaredDist2));
        this.snappedToVertex_ = dist <= this.pixelTolerance_;
        if (this.snappedToVertex_) {
          vertex =
            squaredDist1 > squaredDist2 ? closestSegment[1] : closestSegment[0];
        }
        return vertex;
      }
    }
    return null;
  }

  handlePointerMove_(mapBrowserEvent) {
    // console.log('[Extent/handlePointerMove_]', mapBrowserEvent)
    const pixel = mapBrowserEvent.pixel;
    const map = mapBrowserEvent.map;

    let vertex = this.snapToVertex_(pixel, map);
    if (!vertex) {
      vertex = map.getCoordinateFromPixelInternal(pixel);
    }
    this.createOrUpdatePointerFeature_(vertex);
  }

  createOrUpdateExtentFeature_(extent) {
    let extentFeature = this.extentFeature_;

    if (!extentFeature) {
      if (!extent) {
        extentFeature = new Feature({});
      } else {
        extentFeature = new Feature(polygonFromExtent(extent));
      }
      this.extentFeature_ = extentFeature;
      this.extentOverlay_.getSource().addFeature(extentFeature);
    } else {
      if (!extent) {
        extentFeature.setGeometry(undefined);
      } else {
        extentFeature.setGeometry(polygonFromExtent(extent));
      }
    }
    return extentFeature;
  }

  createOrUpdatePointerFeature_(vertex) {
    let vertexFeature = this.vertexFeature_;
    if (!vertexFeature) {
      vertexFeature = new Feature(new Point(vertex));
      this.vertexFeature_ = vertexFeature;
      this.vertexOverlay_.getSource().addFeature(vertexFeature);
    } else {
      const geometry = vertexFeature.getGeometry();
      geometry.setCoordinates(vertex);
    }
    return vertexFeature;
  }

  handleEvent(mapBrowserEvent) {
    // console.log('[Extent/handleEvent]', mapBrowserEvent)
    if (!mapBrowserEvent.originalEvent || !this.condition_(mapBrowserEvent)) {
      return true;
    }
    //display pointer (if not dragging)
    if (
      mapBrowserEvent.type == MapBrowserEventType.POINTERMOVE &&
      !this.handlingDownUpSequence
    ) {
      this.handlePointerMove_(mapBrowserEvent);
    }
    //call pointer to determine up/down/drag
    super.handleEvent(mapBrowserEvent);
    //return false to stop propagation
    return false;
  }

  handleDownEvent(mapBrowserEvent) {
    const pixel = mapBrowserEvent.pixel;
    const map = mapBrowserEvent.map;

    const extent = this.getExtentInternal();
    let vertex = this.snapToVertex_(pixel, map);

    //find the extent corner opposite the passed corner
    const getOpposingPoint = function (point) {
      let x_ = null;
      let y_ = null;
      if (point[0] == extent[0]) {
        x_ = extent[2];
      } else if (point[0] == extent[2]) {
        x_ = extent[0];
      }
      if (point[1] == extent[1]) {
        y_ = extent[3];
      } else if (point[1] == extent[3]) {
        y_ = extent[1];
      }
      if (x_ !== null && y_ !== null) {
        return [x_, y_];
      }
      return null;
    };
    
    if (vertex && extent) {
      const x =
        vertex[0] == extent[0] || vertex[0] == extent[2] ? vertex[0] : null;
      const y =
        vertex[1] == extent[1] || vertex[1] == extent[3] ? vertex[1] : null;

      //snap to point
      if (x !== null && y !== null) {
        this.pointerHandler_ = getPointHandler(getOpposingPoint(vertex));
        //snap to edge
      } else if (x !== null) {
        this.pointerHandler_ = getEdgeHandler(
          getOpposingPoint([x, extent[1]]),
          getOpposingPoint([x, extent[3]])
        );
      } else if (y !== null) {
        this.pointerHandler_ = getEdgeHandler(
          getOpposingPoint([extent[0], y]),
          getOpposingPoint([extent[2], y])
        );
      }
      //no snap - new bbox
    } else {
      vertex = map.getCoordinateFromPixelInternal(pixel);
      this.setExtent([vertex[0], vertex[1], vertex[0], vertex[1]]);
      this.pointerHandler_ = getPointHandler(vertex);
    }
    return true; //event handled; start downup sequence
  }

  handleDragEvent(mapBrowserEvent) {
    if (this.pointerHandler_) {
      const pixelCoordinate = mapBrowserEvent.coordinate;
      this.setExtent(this.pointerHandler_(pixelCoordinate));
      this.createOrUpdatePointerFeature_(pixelCoordinate);
    }
  }

  handleUpEvent(mapBrowserEvent) {
    this.pointerHandler_ = null;
    //If bbox is zero area, set to null;
    const extent = this.getExtentInternal();
    if (!extent || getArea(extent) === 0) {
      this.setExtent(null);
    }
    return false; //Stop handling downup sequence
  }

  setMap(map) {
    this.extentOverlay_.setMap(map);
    this.vertexOverlay_.setMap(map);
    super.setMap(map);
  }

  getExtent() {
    return toUserExtent(
      this.getExtentInternal(),
      this.getMap().getView().getProjection()
    );
  }

  getExtentInternal() {
    return this.extent_;
  }

  setExtent(extent) {
    //Null extent means no bbox
    this.extent_ = extent ? extent : null;
    this.createOrUpdateExtentFeature_(extent);
    this.dispatchEvent(new ExtentEvent(this.extent_));
  }
}

function getDefaultExtentStyleFunction() {
  const style = createEditingStyle();
  return function (feature, resolution) {
    return style['Polygon'];
  };
}

function getDefaultPointerStyleFunction() {
  const style = createEditingStyle();
  return function (feature, resolution) {
    return style['Point'];
  };
}

function getPointHandler(fixedPoint) {
  return function (point) {
    return boundingExtent([fixedPoint, point]);
  };
}

function getEdgeHandler(fixedP1, fixedP2) {
  if (fixedP1[0] == fixedP2[0]) {
    return function (point) {
      return boundingExtent([fixedP1, [point[0], fixedP2[1]]]);
    };
  } else if (fixedP1[1] == fixedP2[1]) {
    return function (point) {
      return boundingExtent([fixedP1, [fixedP2[0], point[1]]]);
    };
  }
  return null;
}

function getSegments(extent) {
  return [
    [
      [extent[0], extent[1]],
      [extent[0], extent[3]],
    ],
    [
      [extent[0], extent[3]],
      [extent[2], extent[3]],
    ],
    [
      [extent[2], extent[3]],
      [extent[2], extent[1]],
    ],
    [
      [extent[2], extent[1]],
      [extent[0], extent[1]],
    ],
  ];
}

export default Extent;
