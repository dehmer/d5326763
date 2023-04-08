<script>
  import Map from './Map.svelte'
</script>

<div class="site">
  <div class="content">
    <Map></Map>
  </div>
</div>

<style>
  .site {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
  }

  .content {
    flex: 1;
    display: flex;
    flex-direction: row;
    position: relative;
  }
</style>
