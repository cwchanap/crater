<script lang="ts">
  import { cn } from '../utils/cn'

  export let value: string = ''
  export let className: string = ''
  export let placeholder: string = ''

  $: computedClass = cn(
    'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
    className
  )
</script>

<textarea 
  bind:value 
  {placeholder}
  class={computedClass} 
  on:input
  on:change
  on:focus
  on:blur
  {...$$restProps} 
></textarea>