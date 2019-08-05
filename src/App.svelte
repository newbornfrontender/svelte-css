<script>
  import Inner from './components/Inner/Inner.svelte'

  export let name;
</script>

<style>
  @import './styles/a.css';
  @import './styles/b.css';

  h1 {
    color: purple;
  }
</style>

<h1>Hello {name}!</h1>

<Inner />
