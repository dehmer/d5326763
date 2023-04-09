/**
 * @module ol/layer/BaseVector
 */
import Layer from './Layer.js';
import RBush from 'rbush';
import Style, {
  createDefaultStyle,
  toFunction as toStyleFunction,
} from '../style/Style.js';
import {toStyle} from '../style/flat.js';

/**
 * @enum {string}
 * @private
 */
const Property = {
  RENDER_ORDER: 'renderOrder',
};

/**
 * @classdesc
 * Vector data that is rendered client-side.
 * Note that any property set in the options is set as a {@link module:ol/Object~BaseObject}
 * property on the layer object; for example, setting `title: 'My Title'` in the
 * options means that `title` is observable, and has get/set accessors.
 *
 * @template {import("../source/Vector.js").default|import("../source/VectorTile.js").default} VectorSourceType
 * @template {import("../renderer/canvas/VectorLayer.js").default|import("../renderer/canvas/VectorTileLayer.js").default|import("../renderer/canvas/VectorImageLayer.js").default|import("../renderer/webgl/PointsLayer.js").default} RendererType
 * @extends {Layer<VectorSourceType, RendererType>}
 * @api
 */
class BaseVectorLayer extends Layer {
  /**
   * @param {Options<VectorSourceType>} [options] Options.
   */
  constructor(options) {
    options = options ? options : {};

    const baseOptions = Object.assign({}, options);

    delete baseOptions.style;
    delete baseOptions.renderBuffer;
    delete baseOptions.updateWhileAnimating;
    delete baseOptions.updateWhileInteracting;
    super(baseOptions);

    /**
     * @private
     * @type {boolean}
     */
    this.declutter_ =
      options.declutter !== undefined ? options.declutter : false;

    /**
     * @type {number}
     * @private
     */
    this.renderBuffer_ =
      options.renderBuffer !== undefined ? options.renderBuffer : 100;

    /**
     * User provided style.
     * @type {import("../style/Style.js").StyleLike}
     * @private
     */
    this.style_ = null;

    /**
     * Style function for use within the library.
     * @type {import("../style/Style.js").StyleFunction|undefined}
     * @private
     */
    this.styleFunction_ = undefined;

    this.setStyle(options.style);

    /**
     * @type {boolean}
     * @private
     */
    this.updateWhileAnimating_ =
      options.updateWhileAnimating !== undefined
        ? options.updateWhileAnimating
        : false;

    /**
     * @type {boolean}
     * @private
     */
    this.updateWhileInteracting_ =
      options.updateWhileInteracting !== undefined
        ? options.updateWhileInteracting
        : false;
  }

  /**
   * @return {boolean} Declutter.
   */
  getDeclutter() {
    return this.declutter_;
  }

  getFeatures(pixel) {
    return super.getFeatures(pixel);
  }

  /**
   * @return {number|undefined} Render buffer.
   */
  getRenderBuffer() {
    return this.renderBuffer_;
  }

  /**
   * @return {function(import("../Feature.js").default, import("../Feature.js").default): number|null|undefined} Render
   *     order.
   */
  getRenderOrder() {
    return /** @type {import("../render.js").OrderFunction|null|undefined} */ (
      this.get(Property.RENDER_ORDER)
    );
  }

  /**
   * Get the style for features.  This returns whatever was passed to the `style`
   * option at construction or to the `setStyle` method.
   * @return {import("../style/Style.js").StyleLike|null|undefined} Layer style.
   * @api
   */
  getStyle() {
    return this.style_;
  }

  /**
   * Get the style function.
   * @return {import("../style/Style.js").StyleFunction|undefined} Layer style function.
   * @api
   */
  getStyleFunction() {
    return this.styleFunction_;
  }

  /**
   * @return {boolean} Whether the rendered layer should be updated while
   *     animating.
   */
  getUpdateWhileAnimating() {
    return this.updateWhileAnimating_;
  }

  /**
   * @return {boolean} Whether the rendered layer should be updated while
   *     interacting.
   */
  getUpdateWhileInteracting() {
    return this.updateWhileInteracting_;
  }

  renderDeclutter(frameState) {
    if (!frameState.declutterTree) {
      frameState.declutterTree = new RBush(9);
    }
    /** @type {*} */ (this.getRenderer()).renderDeclutter(frameState);
  }

  /**
   * @param {import("../render.js").OrderFunction|null|undefined} renderOrder
   *     Render order.
   */
  setRenderOrder(renderOrder) {
    this.set(Property.RENDER_ORDER, renderOrder);
  }

  /**
   * Set the style for features.  This can be a single style object, an array
   * of styles, or a function that takes a feature and resolution and returns
   * an array of styles. If set to `null`, the layer has no style (a `null` style),
   * so only features that have their own styles will be rendered in the layer. Call
   * `setStyle()` without arguments to reset to the default style. See
   * [the ol/style/Style module]{@link module:ol/style/Style~Style} for information on the default style.
   *
   * If your layer has a static style, you can use "flat" style object literals instead of
   * using the `Style` and symbolizer constructors (`Fill`, `Stroke`, etc.).  See the documentation
   * for the [flat style types]{@link module:ol/style/flat~FlatStyle} to see what properties are supported.
   *
   * @param {import("../style/Style.js").StyleLike|import("../style/flat.js").FlatStyleLike|null} [style] Layer style.
   * @api
   */
  setStyle(style) {
    /**
     * @type {import("../style/Style.js").StyleLike|null}
     */
    let styleLike;

    if (style === undefined) {
      styleLike = createDefaultStyle;
    } else if (style === null) {
      styleLike = null;
    } else if (typeof style === 'function') {
      styleLike = style;
    } else if (style instanceof Style) {
      styleLike = style;
    } else if (Array.isArray(style)) {
      const len = style.length;

      /**
       * @type {Array<Style>}
       */
      const styles = new Array(len);

      for (let i = 0; i < len; ++i) {
        const s = style[i];
        if (s instanceof Style) {
          styles[i] = s;
        } else {
          styles[i] = toStyle(s);
        }
      }
      styleLike = styles;
    } else {
      styleLike = toStyle(style);
    }

    this.style_ = styleLike;
    this.styleFunction_ =
      style === null ? undefined : toStyleFunction(this.style_);
    this.changed();
  }
}

export default BaseVectorLayer;
