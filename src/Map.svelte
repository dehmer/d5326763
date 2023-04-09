<script>
  import * as ol from './ol'
  import { OSM, Vector as VectorSource } from './ol/source'
  import { Tile as TileLayer, Vector as VectorLayer } from './ol/layer'
  import Draw from './ol/interaction/Draw'

  const setup = target => {
    const zoom = 14
    const center = [1737884.370211603, 6146136.723228034]
    const defaultViewport = { zoom, center }
    const view = new ol.View(defaultViewport)
    const tileLayer = new TileLayer({ source: new OSM() })
    const vectorSource = new VectorSource({ wrapX: false })
    const vectorLayer = new VectorLayer({ source: vectorSource })

    let map = new ol.Map({
      target,
      layers: [tileLayer, vectorLayer],
      view,
      controls: []
    })

    const draw = new Draw({ source: vectorSource, type: 'Polygon' })
    map.addInteraction(draw)

    const destroy = () => {
      if (map) {
        map.dispose()
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