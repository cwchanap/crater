# @crater/ui-components

A collection of reusable UI components built with shadcn/ui, Radix UI, and Tailwind CSS.

## Installation

```bash
pnpm add @crater/ui-components
```

## Usage

Import the components you need:

```tsx
import { Button, Card, CardHeader, CardContent } from '@crater/ui-components'

function MyComponent() {
    return (
        <Card>
            <CardHeader>
                <h2>Welcome</h2>
            </CardHeader>
            <CardContent>
                <Button>Click me</Button>
            </CardContent>
        </Card>
    )
}
```

## Styling

This package requires Tailwind CSS to be configured in your project. Make sure to include the package's styles in your Tailwind configuration:

```js
// tailwind.config.js
module.exports = {
    content: [
        // ... your content
        './node_modules/@crater/ui-components/dist/**/*.{js,ts,jsx,tsx}',
    ],
    // ... rest of config
}
```

You should also import the CSS variables:

```css
/* In your main CSS file */
@import '@crater/ui-components/dist/styles.css';
```

## Components

### Button

A versatile button component with multiple variants and sizes.

```tsx
<Button variant="default" size="md">
  Default Button
</Button>

<Button variant="outline" size="sm">
  Outline Button
</Button>

<Button variant="destructive" size="lg">
  Destructive Button
</Button>
```

### Card

A flexible card component for displaying content.

```tsx
<Card>
    <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description</CardDescription>
    </CardHeader>
    <CardContent>
        <p>Card content goes here</p>
    </CardContent>
    <CardFooter>
        <Button>Action</Button>
    </CardFooter>
</Card>
```

## Development

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Watch for changes
pnpm dev

# Type check
pnpm type-check

# Lint
pnpm lint
```
