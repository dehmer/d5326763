<script>
  import * as ol from './ol'
  import { OSM } from './ol/source'
  import { Tile as TileLayer } from './ol/layer'

  const setup = target => {
    const zoom = 14
    const center = [1737884.370211603, 6146136.723228034]
    const defaultViewport = { zoom, center }
    const view = new ol.View(defaultViewport)
    const source = new OSM()
    const tileLayer = new TileLayer({ source })

    let map = new ol.Map({
      target,
      layers: [tileLayer],
      view,
      controls: []
    })

    const destroy = () => {
      if (map) {
        map.dispose(null)
        map = null
      }
    }

    return { destroy }
  }
</script>

<div class='map' use:setup/>

<style>
  .map {
    touch-action: none;
    flex: 1;
  }
</style>