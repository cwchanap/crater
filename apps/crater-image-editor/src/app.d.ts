declare module '*.svelte' {
    import type { ComponentType, SvelteComponent } from 'svelte'
    const component: ComponentType<SvelteComponent>
    export default component
}

declare const acquireVsCodeApi: () => {
    postMessage(message: any): void
    getState(): any
    setState(state: any): void
}
