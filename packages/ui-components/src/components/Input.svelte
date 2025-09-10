<script lang="ts">
  import { cn } from '../utils/cn'

  export let value: string = ''
  export let type: string = 'text'
  export let className: string = ''
  export let placeholder: string = ''

  $: computedClass = cn(
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
    className
  )
</script>

{#if type === 'text'}
  <input 
    bind:value 
    type="text"
    {placeholder}
    class={computedClass} 
    on:input
    on:change
    on:focus
    on:blur
    {...$$restProps} 
  />
{:else if type === 'email'}
  <input 
    bind:value 
    type="email"
    {placeholder}
    class={computedClass} 
    on:input
    on:change
    on:focus
    on:blur
    {...$$restProps} 
  />
{:else if type === 'password'}
  <input 
    bind:value 
    type="password"
    {placeholder}
    class={computedClass} 
    on:input
    on:change
    on:focus
    on:blur
    {...$$restProps} 
  />
{:else if type === 'number'}
  <input 
    bind:value 
    type="number"
    {placeholder}
    class={computedClass} 
    on:input
    on:change
    on:focus
    on:blur
    {...$$restProps} 
  />
{:else}
  <input 
    bind:value 
    type="text"
    {placeholder}
    class={computedClass} 
    on:input
    on:change
    on:focus
    on:blur
    {...$$restProps} 
  />
{/if}