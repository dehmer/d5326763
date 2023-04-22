<script>
  import * as ol from './ol'
  import { OSM } from './ol/source'
  import { Tile as TileLayer } from './ol/layer'

  const setup = target => {
    target.focus()

    const zoom = 14
    const center = [1737884.370211603, 6146136.723228034]
    const defaultViewport = { zoom, center }
    const view = new ol.View(defaultViewport)
    const controls = []
    const layers = [
        new TileLayer({ source: new OSM() })
      ]

    let map = new ol.Map({
      target,
      layers,
      view,
      controls
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