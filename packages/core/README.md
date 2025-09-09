# @crater/core

Core shared logic and utilities for Crater applications.

## Features

- **Utilities**: Common utility functions for date formatting, ID generation, debouncing, throttling, and more
- **Types**: Shared TypeScript interfaces and types used across applications
- **Constants**: Application-wide constants including HTTP status codes, storage keys, and regex patterns
- **Services**: Core services like EventEmitter and PreferencesService

## Installation

```bash
pnpm add @crater/core
```

## Usage

### Utilities

```typescript
import { formatDate, generateId, debounce } from '@crater/core'

// Format dates consistently
const formattedDate = formatDate(new Date())

// Generate unique IDs
const id = generateId('user')

// Debounce function calls
const debouncedSearch = debounce((query: string) => {
  // Search logic
}, 300)
```

### Types

```typescript
import { ApiResponse, BaseEntity, UserPreferences } from '@crater/core'

interface User extends BaseEntity {
  name: string
  email: string
}

const response: ApiResponse<User> = {
  data: user,
  success: true,
  message: 'User retrieved successfully',
}
```

### Constants

```typescript
import { HTTP_STATUS, STORAGE_KEYS, REGEX_PATTERNS } from '@crater/core'

// Use HTTP status codes
if (response.status === HTTP_STATUS.OK) {
  // Handle success
}

// Access storage keys
const preferences = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES)

// Validate with regex patterns
const isValidEmail = REGEX_PATTERNS.EMAIL.test(email)
```

### Services

```typescript
import { EventEmitter, PreferencesService } from '@crater/core'

// Use the global event emitter
import { globalEventEmitter } from '@crater/core'

globalEventEmitter.on('user:login', (user) => {
  console.log('User logged in:', user)
})

// Use preferences service
const prefsService = PreferencesService.getInstance()
const theme = prefsService.getPreference('theme')
prefsService.setPreference('theme', 'dark')
```

## Development

```bash
# Install dependencies
pnpm install

# Build the package
pnpm run build

# Run in development mode
pnpm run dev

# Run tests
pnpm run test

# Type check
pnpm run type-check
```
