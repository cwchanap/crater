<script lang="ts">
  import { cn } from '../utils/cn'

  export let className: string = ''

  $: computedClass = cn('text-sm text-muted-foreground', className)
</script>

<p class={computedClass} {...$$restProps}>
  <slot />
</p>