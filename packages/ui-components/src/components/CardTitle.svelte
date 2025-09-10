<script lang="ts">
  import { cn } from '../utils/cn'

  export let className: string = ''

  $: computedClass = cn(
    'text-2xl font-semibold leading-none tracking-tight',
    className
  )
</script>

<h3 class={computedClass} {...$$restProps}>
  <slot />
</h3>