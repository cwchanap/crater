<script lang="ts">
  import { cn } from '../utils/cn'

  export let className: string = ''

  $: computedClass = cn(
    'rounded-lg border bg-card text-card-foreground shadow-sm',
    className
  )
</script>

<div class={computedClass} {...$$restProps}>
  <slot />
</div>