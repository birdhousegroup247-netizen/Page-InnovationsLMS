# Page Innovations LMS - Testing Guide

## Overview

This directory contains all tests for the Page Innovations LMS backend.

## Test Structure

```
__tests__/
├── unit/                  # Unit tests for individual functions
│   └── jwt.test.js       # JWT utility tests
│
├── integration/           # Integration tests for API endpoints
│   └── auth.test.js      # Authentication API tests
│
└── README.md             # This file
```

## Running Tests

```bash
# Run all tests with coverage
npm test

# Run tests in watch mode
npm run test:watch

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

## Writing Tests

### Unit Tests

Unit tests should test individual functions in isolation.

Example:
```javascript
const myFunction = require('../../utils/myFunction');

describe('myFunction', () => {
  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });
});
```

### Integration Tests

Integration tests should test API endpoints end-to-end.

Example:
```javascript
const request = require('supertest');
const app = require('../../server');

describe('GET /api/endpoint', () => {
  it('should return 200', async () => {
    const response = await request(app)
      .get('/api/endpoint')
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
  });
});
```

## Test Coverage

Current coverage goals:
- **Unit Tests:** 80% coverage
- **Integration Tests:** All critical API endpoints

## Environment Setup

Tests use the same `.env` configuration as development. Make sure your test database is set up:

```bash
# Create test database
mysql -u root -p
CREATE DATABASE pageinnovation_lms_test;
```

Optionally, set `NODE_ENV=test` and use a separate test database.

## Best Practices

1. **Isolation:** Each test should be independent
2. **Cleanup:** Always clean up test data after tests
3. **Descriptive Names:** Use clear, descriptive test names
4. **One Assertion:** Each test should test one thing
5. **Mock External Services:** Mock third-party APIs (email, cloudinary, etc.)

## TODO

- [ ] Add tests for course management
- [ ] Add tests for exam system
- [ ] Add tests for certificate generation
- [ ] Add tests for knowledge center
- [ ] Add tests for all middleware
- [ ] Setup CI/CD integration
- [ ] Mock external services (email, storage)
