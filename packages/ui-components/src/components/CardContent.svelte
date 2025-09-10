<script lang="ts">
  import { cn } from '../utils/cn'

  export let className: string = ''

  $: computedClass = cn('p-6 pt-0', className)
</script>

<div class={computedClass} {...$$restProps}>
  <slot />
</div>