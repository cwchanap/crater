<script lang="ts">
  import { cn } from '../utils/cn'

  export let className: string = ''

  $: computedClass = cn('flex flex-col space-y-1.5 p-6', className)
</script>

<div class={computedClass} {...$$restProps}>
  <slot />
</div>