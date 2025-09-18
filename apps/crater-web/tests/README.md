# Crater Web E2E Test Suite

This directory contains comprehensive end-to-end tests for the Crater Web application using Playwright.

## Test Structure

### Test Files

- **`chatbot.spec.ts`** - Main chatbot functionality tests
  - Page loading and layout
  - Chatbot initial state
  - Settings panel functionality
  - Chat message flow
  - Message formatting and display
  - UI interactions

- **`settings.spec.ts`** - Settings panel specific tests
  - Settings panel visibility
  - Provider selection (None, Gemini, OpenAI)
  - API key validation
  - Save/cancel actions
  - Provider status updates
  - Accessibility

- **`responsive.spec.ts`** - Responsive design tests
  - Desktop layout (1280x720, 1920x1080)
  - Tablet layout (768x1024, 1024x768)
  - Mobile layout (375x667, 360x640, 320x568)
  - Cross-device consistency
  - Touch interactions
  - Orientation changes

- **`accessibility-performance.spec.ts`** - Accessibility and performance tests
  - Semantic HTML structure
  - Keyboard navigation
  - Screen reader support
  - Focus management
  - Performance benchmarks
  - Error handling
  - Browser compatibility

### Test Helpers

- **`test-helpers.ts`** - Reusable test utilities
  - `ChatbotTestHelper` - Chatbot-specific actions and assertions
  - `ResponsiveTestHelper` - Viewport management utilities
  - `AccessibilityTestHelper` - Accessibility testing utilities
  - `PerformanceTestHelper` - Performance measurement utilities
  - `TestDataHelper` - Test data and constants

## Running Tests

### Prerequisites

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
pnpm playwright:install
```

### Test Commands

```bash
# Run all tests (headless)
pnpm test:e2e

# Run tests with browser UI visible
pnpm test:e2e:headed

# Run tests with Playwright UI for debugging
pnpm test:e2e:ui

# Run specific test file
pnpm test:e2e tests/chatbot.spec.ts

# Run tests in debug mode
pnpm test:e2e:debug

# Run all tests (unit + e2e)
pnpm test:all
```

### Test Configuration

The test configuration is defined in `playwright.config.ts`:

- **Base URL**: `http://localhost:5173`
- **Browsers**: Chrome, Firefox, Safari (Desktop + Mobile)
- **Auto-start dev server**: Automatically starts `pnpm dev` before tests
- **Retries**: 2 retries on CI, 0 locally
- **Screenshots**: On failure only
- **Videos**: Retained on failure
- **Traces**: On first retry

## Test Coverage

### Functional Testing

- ✅ Page loading and initial state
- ✅ Settings panel interactions
- ✅ Provider selection and configuration
- ✅ Chat message sending and receiving
- ✅ Clear chat functionality
- ✅ Message formatting and timestamps
- ✅ Error handling and edge cases

### Responsive Design

- ✅ Desktop layouts (1280px+)
- ✅ Tablet layouts (768-1024px)
- ✅ Mobile layouts (320-667px)
- ✅ Orientation changes
- ✅ Cross-device consistency

### Accessibility

- ✅ Semantic HTML structure
- ✅ Keyboard navigation
- ✅ Screen reader compatibility
- ✅ Focus management
- ✅ Form labels and associations
- ✅ ARIA attributes
- ✅ Color contrast and reduced motion

### Performance

- ✅ Page load time (< 3 seconds)
- ✅ Chat response time (< 2 seconds)
- ✅ Multiple rapid interactions
- ✅ Long chat history performance
- ✅ Settings panel performance
- ✅ Responsive rendering performance

### Browser Compatibility

- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari/WebKit
- ✅ Mobile Chrome
- ✅ Mobile Safari

## CI Integration

Tests run automatically on:

- Push to `main` or `develop` branches
- Pull requests targeting `main` or `develop`
- Changes to `apps/crater-web/**` or `packages/core/**`

### GitHub Actions Workflow

The `.github/workflows/playwright-tests.yml` workflow:

1. Sets up Node.js and pnpm
2. Installs dependencies
3. Builds packages
4. Installs Playwright browsers
5. Runs tests with retry logic
6. Uploads test reports and results as artifacts

### Artifacts

- **Playwright Report**: HTML report with test results and traces
- **Test Results**: Screenshots, videos, and trace files from failures
- **Retention**: 30 days

## Test Data

### Valid API Keys (for testing)

- **Gemini**: `AIzaTestKey123456789` (starts with "AIza")
- **OpenAI**: `sk-test1234567890abcdef` (starts with "sk-")

### Test Messages

- General game asset questions
- Specific requests (sprites, backgrounds, UI)
- Image generation keywords (generate, create, image)
- Edge cases (empty, long, special characters)

## Debugging

### Local Debugging

```bash
# Run with visible browser
pnpm test:e2e:headed

# Run with Playwright UI
pnpm test:e2e:ui

# Run specific test with debug
pnpm test:e2e:debug -- tests/chatbot.spec.ts
```

### CI Debugging

1. Check the GitHub Actions workflow logs
2. Download the Playwright report artifact
3. Download test results (screenshots/videos) artifact
4. Review trace files in Playwright trace viewer

### Common Issues

1. **Test timeouts**: Increase timeout in test or check if dev server is running
2. **Element not found**: Check if selectors match current UI
3. **Flaky tests**: Add proper wait conditions and check for race conditions
4. **Performance failures**: Check if thresholds are realistic for CI environment

## Contributing

When adding new tests:

1. **Use test helpers** for common actions
2. **Follow naming conventions** (describe blocks and test names)
3. **Add proper waits** and assertions
4. **Test edge cases** and error conditions
5. **Keep tests isolated** and independent
6. **Add comments** for complex test logic
7. **Update this README** if adding new test files or significant functionality

### Test Organization

- Group related tests in `describe` blocks
- Use descriptive test names that explain what is being tested
- Put setup code in `beforeEach` hooks
- Use page object patterns via test helpers
- Keep individual tests focused on one aspect

### Best Practices

- Always wait for elements to be visible before interacting
- Use proper locators (roles, labels, text content)
- Test both positive and negative scenarios
- Verify state changes after actions
- Clean up state between tests when needed
- Use realistic test data
- Test accessibility and performance regularly
