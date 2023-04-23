<script>
  import Map from './ol/Map'
  import View from './ol/View'
  import XYZ from './ol/source/XYZ'
  import TileLayer from './ol/layer/Tile'
  import { defaults as defaultInteractions } from './ol/interaction/defaults'

  const setup = target => {
    target.focus()

    const zoom = 14
    const center = [1737884.370211603, 6146136.723228034]
    const defaultViewport = { zoom, center }
    const view = new View(defaultViewport)
    const controls = []
    const interactions = defaultInteractions({ onFocusOnly: true })
    const osm = new XYZ({ url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'})
    const layers = [
        new TileLayer({ source: osm })
    ]

    let map = new Map({
      target,
      layers,
      view,
      controls,
      interactions
    })

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