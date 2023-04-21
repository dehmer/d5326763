<script>
  import * as R from 'ramda'
  import * as ol from './ol'
  import { OSM, Vector as VectorSource } from './ol/source'
  import { Tile as TileLayer, Vector as VectorLayer } from './ol/layer'
  import { Kinetic } from './ol'
  import * as Interaction from './ol/interaction'
  // import Extent from './ol/interaction/Extent.b9b8'
  // import Extent from './ol/interaction/Extent.ae74'
  // import Extent from './ol/interaction/Extent.428d'
  import Extent from './ol/interaction/Extent.b60e'
  import GeoJSON from './ol/format/GeoJSON'

  const geoJSON = new GeoJSON()

  const readFeature = source => geoJSON.readFeature(source)

  const features = [
    {"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[1736111.9119727048,6147537.894573678],[1738602.87081293,6147793.704823613],[1738665.3491260887,6145718.782875134],[1737408.2063410645,6145394.5599919725],[1736711.0170401041,6146072.34145372],[1736112.5837825236,6147159.143126882],[1736111.9119727048,6147537.894573678]]]},"properties":null},
    {"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[1736340.999120954,6145500.817911664],[1737113.5430899358,6145742.109604957],[1737401.040369663,6145418.483886079],[1737493.8247702082,6144918.993285717],[1737780.0903986003,6144371.020410092],[1736811.2659941928,6143682.9751872225],[1736085.8233580703,6144350.268951241],[1735768.691800776,6144831.247458815],[1735712.9315858062,6145075.226391383],[1736311.700748296,6145378.2126197135],[1736304.7353884035,6145489.2385541275],[1736340.999120954,6145500.817911664]]]},"properties":null},
    {"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[1741210.687238878,6147905.971708907],[1740861.9806200946,6146530.142522541],[1742532.323766518,6146649.388765398],[1742935.9694993813,6147480.940030141],[1742926.5268391487,6147674.010707543],[1742283.0076781658,6147682.371007512],[1742316.8221057178,6147941.017787794],[1741210.687238878,6147905.971708907]]]},"properties":null}
  ]

  const setup = target => {
    target.focus()

    const zoom = 14
    const center = [1737884.370211603, 6146136.723228034]
    const defaultViewport = { zoom, center }
    const view = new ol.View(defaultViewport)
    const tileLayer = new TileLayer({ source: new OSM() })
    const vectorSource = new VectorSource({ wrapX: false, features: R.map(readFeature, features) })
    const vectorLayer = new VectorLayer({ source: vectorSource })

    const wrap = interaction => {
      const fn = interaction.handleEvent.bind(interaction)
      return event => {
        const cont = fn(event)
        return (!cont || event.propagationStopped)
          ? null
          : event
      }
    }

    const options = { onFocusOnly: true}
    const kinetic = new Kinetic(-0.005, 0.05, 100);

    const doubleClickZoom = () => new Interaction.DoubleClickZoom({
      delta: options.zoomDelta,
      duration: options.zoomDuration,
    })

    const dragPan = () => new Interaction.DragPan({
      onFocusOnly: options.onFocusOnly,
      kinetic: kinetic,
    })

    const keyboardZoom = () => new Interaction.KeyboardZoom({
      delta: options.zoomDelta,
      duration: options.zoomDuration,
    })

    const mouseWheelZoom = () => new Interaction.MouseWheelZoom({
      onFocusOnly: options.onFocusOnly,
      duration: options.zoomDuration,
    })
 
    const modify = () => new Interaction.Modify({ 
      source: vectorSource,
      modifystart: features => console.log('[modifystart]', features),
      modifyend: features => console.log('[modifyend]', features)
    })

    const draw = () => new Interaction.Draw({ 
      source: vectorSource, 
      type: 'Polygon',
      drawstart: feature => console.log('[drawstart]', feature),
      drawend: feature => console.log('[drawend]', geoJSON.writeFeature(feature)),
      drawabort: feature => console.log('[drawabort]', feature)
    })

    const xinteractions = [
      // wrap(doubleClickZoom()),
      // wrap(dragPan()),
      // wrap(keyboardZoom()),
      // wrap(mouseWheelZoom()),
      // wrap(draw()),
      // wrap(modify()),
      Extent({
        extentchanged: extent => console.log('extentchanged', extent)
      })
    ]

    let map = new ol.Map({
      target,
      layers: [tileLayer, vectorLayer],
      view,
      xinteractions,
      interactions: [],
      // interactions: [new Interaction.Extent()],
      controls: []
    })

    // setTimeout(() => map.removeXInteraction(xinteractions[0]), 5000)

    const destroy = () => {
      if (map) {
        map.dispose()
        map = null
      }
    }

    return { destroy }
  }
</script>

<!-- tabIndex required for map target to accept focus and keyboard events. -->
<div class='map' tabIndex='0' use:setup/>

<style>
  .map {
    touch-action: none;
    flex: 1;
  }
</style>