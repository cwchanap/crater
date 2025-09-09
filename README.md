# Crater Monorepo

A modern monorepo setup with Turborepo, featuring a VS Code extension, web application, and shared UI components.

## What's inside?

This Turborepo includes the following packages and apps:

### Apps

- `crater-ext`: A VS Code extension
- `crater-web`: A SvelteKit web application

### Packages

- `@crater/ui-components`: A React component library built with shadcn/ui, Radix UI, and Tailwind CSS

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 8

### Installation

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

## Development

### Build all packages and apps

```bash
pnpm build
```

### Develop all packages and apps

```bash
pnpm dev
```

### Run type checking

```bash
pnpm type-check
```

### Run linting

```bash
pnpm lint
```

### Fix linting issues

```bash
pnpm lint:fix
```

### Format code

```bash
pnpm format
```

### Check formatting

```bash
pnpm format:check
```

### Run tests

```bash
pnpm test
```

## Working with packages

### Building the UI Components

```bash
cd packages/ui-components
pnpm build
```

### Using UI Components in other apps

The UI components package is available as `@crater/ui-components` and can be used in other packages within the monorepo:

```json
{
  "dependencies": {
    "@crater/ui-components": "workspace:*"
  }
}
```

## Project Structure

```
crater/
├── apps/
│   ├── crater-ext/          # VS Code extension
│   └── crater-web/          # SvelteKit web app
├── packages/
│   └── ui-components/       # React UI component library
├── package.json             # Root package.json with workspace config
├── pnpm-workspace.yaml      # pnpm workspace configuration
├── turbo.json              # Turborepo configuration
└── README.md               # This file
```

## Code Quality

This project enforces code quality through:

### ESLint (Flat Config)

- **Configuration**: `eslint.config.js` (ESLint 9+ flat config format)
- **TypeScript Support**: Full TypeScript linting with `typescript-eslint`
- **Environment-specific rules**: Different rules for Node.js config files, React components, VS Code extensions, and test files
- **Prettier Integration**: ESLint and Prettier work together seamlessly

### Prettier

- **Configuration**: `.prettierrc.json`
- **Consistent Formatting**: Enforces consistent code style across all files
- **Automatic Formatting**: Formats code on save and pre-commit

### Husky & lint-staged

- **Pre-commit Hooks**: Automatically runs linting and formatting before commits
- **Staged Files Only**: Only processes files that are staged for commit
- **Fast**: Only runs on changed files for quick feedback

### Setup Details

- **ESLint**: Configured with flat config format for modern ESLint 9+
- **TypeScript**: Full TypeScript support with project references
- **Multiple Environments**: Handles Node.js, React, VS Code extension environments
- **Git Hooks**: Husky manages git hooks, lint-staged runs tools on staged files

## Technologies Used

- **Build System**: Turborepo
- **Package Manager**: pnpm
- **Web Framework**: SvelteKit (crater-web)
- **Extension Framework**: VS Code Extension API (crater-ext)
- **UI Library**: React + shadcn/ui + Radix UI (ui-components)
- **Styling**: Tailwind CSS
- **TypeScript**: Full TypeScript support across all packages

## Contributing

1. Make your changes
2. Run `pnpm build` to ensure everything builds correctly
3. Run `pnpm test` to ensure tests pass
4. Submit a pull request

## License

ISC
