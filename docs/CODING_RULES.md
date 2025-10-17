# Coding Rules and Standards

This document outlines the coding rules and standards that **must** be followed when working on this project. These rules ensure code quality, maintainability, and consistency across the codebase.

## Table of Contents

1. [Core Principles](#core-principles)
2. [Linting Rules](#linting-rules)
3. [Code Quality Standards](#code-quality-standards)
4. [Language-Specific Guidelines](#language-specific-guidelines)
5. [Testing Requirements](#testing-requirements)
6. [Documentation Standards](#documentation-standards)

## Core Principles

### DRY (Don't Repeat Yourself)
- **Never** duplicate code logic across multiple locations
- Extract common functionality into reusable functions or modules
- Create shared utilities for repeated patterns
- Use inheritance, composition, or mixins appropriately
- If you find yourself copying code, refactor it into a shared component

### Readability
- Code should be self-documenting and easy to understand
- Use descriptive variable and function names
- Prefer clarity over cleverness
- Break complex logic into smaller, named functions
- Add comments only when the "why" is not obvious from the code

### Usability
- Design APIs and interfaces that are intuitive and consistent
- Provide helpful error messages with context
- Validate inputs early and fail gracefully
- Follow the principle of least surprise
- Make common tasks easy and complex tasks possible

### Reproducibility
- All builds must be deterministic and reproducible
- Pin dependency versions (use lock files)
- Document all environment dependencies
- Use configuration files instead of magic values
- Ensure local development matches production as closely as possible

## Linting Rules

All code **must** pass linting checks before being committed. Linting violations will cause CI/CD pipelines to fail.

### Whitespace and Formatting

#### General Rules
- **No trailing whitespace** on any line
- Use consistent indentation (as defined by language standards)
- Files must end with a single newline character
- No multiple consecutive blank lines (maximum 1 blank line between sections)
- Blank lines should be used to separate logical blocks

#### Backend (Rust)
```bash
# Format code automatically
cargo fmt

# Check formatting without modifying files
cargo fmt -- --check

# This will catch:
# - Incorrect indentation
# - Trailing whitespace
# - Missing blank lines between items
# - Inconsistent spacing
```

#### Frontend (TypeScript/JavaScript)
```bash
# Run linter
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix

# This will catch:
# - Trailing whitespace
# - Missing semicolons (if configured)
# - Inconsistent indentation
# - Unused imports
```

### Rust: Clippy Rules

All code **must** pass Clippy checks with zero warnings:

```bash
# Run clippy with warnings as errors
cargo clippy -- -D warnings
```

#### Key Clippy Annotations and Rules

**Required Lint Levels:**
- All clippy warnings are treated as errors in CI/CD
- No `#[allow(clippy::...)]` without documented justification
- Prefer fixing the issue over suppressing the warning

**Common Clippy Rules to Follow:**

1. **Avoid unwrap() in production code**
   ```rust
   // Bad
   let value = some_option.unwrap();
   
   // Good
   let value = some_option.expect("Descriptive error message");
   // Or
   let value = some_option?;
   ```

2. **Use proper error propagation**
   ```rust
   // Bad
   fn process() -> Result<(), Error> {
       let data = fetch_data().unwrap();
       Ok(())
   }
   
   // Good
   fn process() -> Result<(), Error> {
       let data = fetch_data()?;
       Ok(())
   }
   ```

3. **Avoid unnecessary clones**
   ```rust
   // Bad
   fn process(data: String) -> String {
       data.clone()
   }
   
   // Good (take ownership if you don't need the original)
   fn process(data: String) -> String {
       data
   }
   ```

4. **Use iterator methods instead of loops**
   ```rust
   // Bad
   let mut result = Vec::new();
   for item in items {
       result.push(item.process());
   }
   
   // Good
   let result: Vec<_> = items.iter().map(|item| item.process()).collect();
   ```

5. **Match arms should be consistent**
   ```rust
   // Bad (inconsistent return types)
   match value {
       Some(x) => x,
       None => return Err(error),
   }
   
   // Good
   match value {
       Some(x) => Ok(x),
       None => Err(error),
   }
   ```

6. **Redundant field names in struct literals**
   ```rust
   // Bad
   let person = Person {
       name: name,
       age: age,
   };
   
   // Good
   let person = Person { name, age };
   ```

7. **Use `if let` for single pattern matching**
   ```rust
   // Bad
   match option {
       Some(val) => do_something(val),
       None => {},
   }
   
   // Good
   if let Some(val) = option {
       do_something(val);
   }
   ```

### TypeScript/JavaScript: ESLint Rules

All code **must** pass ESLint checks:

```bash
npm run lint
```

**Key Rules:**
- No unused variables or imports
- Consistent use of `const` over `let` when possible
- Prefer template literals over string concatenation
- No `any` types without justification (use `unknown` if needed)
- All async functions must handle errors properly
- Consistent quote style (single quotes)
- Proper TypeScript type annotations

## Code Quality Standards

### Complexity Limits
- **Functions**: Maximum 50 lines of code (excluding comments/whitespace)
- **Cyclomatic Complexity**: Maximum of 10 per function
- **File Length**: Maximum 500 lines per file
- **Function Parameters**: Maximum 5 parameters (use structs/objects for more)

If you exceed these limits, refactor your code into smaller units.

### Error Handling

#### Backend (Rust)
- Always use `Result<T, E>` for fallible operations
- Never use `.unwrap()` or `.expect()` without clear justification
- Provide descriptive error messages
- Use `?` operator for error propagation
- Create custom error types when appropriate

```rust
// Good error handling
pub fn process_data(input: &str) -> Result<Data, ProcessError> {
    let parsed = parse_input(input)
        .map_err(|e| ProcessError::ParseFailed(e.to_string()))?;
    
    validate_data(&parsed)?;
    
    Ok(parsed)
}
```

#### Frontend (TypeScript)
- Use try-catch for async operations
- Provide user-friendly error messages
- Log errors for debugging
- Never silently fail

```typescript
// Good error handling
async function fetchData(): Promise<Data> {
  try {
    const response = await api.getData();
    return response.data;
  } catch (error) {
    console.error('Failed to fetch data:', error);
    throw new Error('Unable to load data. Please try again.');
  }
}
```

### Naming Conventions

#### Rust
- **Functions/Variables**: `snake_case`
- **Types/Traits**: `PascalCase`
- **Constants**: `SCREAMING_SNAKE_CASE`
- **Modules**: `snake_case`

```rust
const MAX_RETRIES: u32 = 3;

struct UserProfile {
    user_name: String,
}

fn calculate_total_amount(items: &[Item]) -> f64 {
    // ...
}
```

#### TypeScript/JavaScript
- **Variables/Functions**: `camelCase`
- **Classes/Components**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Private fields**: prefix with `_` (or use TypeScript private)

```typescript
const MAX_ATTEMPTS = 3;

class DataProcessor {
  private _cache: Map<string, Data>;
  
  processUserData(userId: string): ProcessedData {
    // ...
  }
}
```

### Comments and Documentation

#### When to Comment
- **Do**: Explain complex algorithms or business logic
- **Do**: Document public APIs and exported functions
- **Do**: Add TODOs with context and tracking info
- **Don't**: State the obvious
- **Don't**: Leave commented-out code

#### Documentation Comments

**Rust:**
```rust
/// Calculate the fat loss percentage based on calorie deficit
///
/// # Arguments
/// * `kcal_deficit` - Total calorie deficit in kcal
/// * `weight_loss_kg` - Total weight loss in kilograms
///
/// # Returns
/// Returns the percentage of fat vs muscle loss
///
/// # Example
/// ```
/// let result = calculate_fat_loss(3500.0, 0.5);
/// assert_eq!(result.fat_percentage, 100.0);
/// ```
pub fn calculate_fat_loss(kcal_deficit: f64, weight_loss_kg: f64) -> FatLossResult {
    // Implementation
}
```

**TypeScript:**
```typescript
/**
 * Fetch user data from the API
 * 
 * @param userId - The unique identifier of the user
 * @returns Promise resolving to user data
 * @throws {ApiError} When the API request fails
 */
async function fetchUserData(userId: string): Promise<UserData> {
  // Implementation
}
```

## Language-Specific Guidelines

### Rust Best Practices

1. **Ownership and Borrowing**
   - Prefer borrowing over cloning when possible
   - Use `&str` over `String` for function parameters
   - Return owned types when transferring ownership

2. **Type Safety**
   - Use `newtype` patterns for domain-specific types
   - Leverage the type system to prevent invalid states
   - Use `Option<T>` and `Result<T, E>` appropriately

3. **Performance**
   - Use iterators instead of collecting unnecessarily
   - Avoid allocations in hot paths
   - Use `&str` instead of `String` when you don't need ownership

4. **Concurrency**
   - Prefer message passing over shared state
   - Use `tokio` for async operations
   - Document thread safety requirements

### TypeScript/React Best Practices

1. **Type Safety**
   - Always define prop types for components
   - Use `interface` for object types
   - Avoid `any` - use `unknown` if type is truly unknown

2. **Component Design**
   - Keep components small and focused
   - Extract reusable logic into custom hooks
   - Use composition over inheritance

3. **State Management**
   - Keep state as local as possible
   - Use React hooks appropriately
   - Avoid unnecessary re-renders with `React.memo`, `useMemo`, `useCallback`

4. **Performance**
   - Use code splitting for large components
   - Optimize images and assets
   - Implement proper loading states

## Testing Requirements

### Coverage Requirements
- **Backend**: Minimum 80% code coverage
- **Frontend**: Minimum 70% code coverage (when tests are implemented)

### Test Quality
- Tests must be deterministic (no flaky tests)
- Test behavior, not implementation
- Use descriptive test names
- Follow Arrange-Act-Assert pattern

### Backend Testing (Rust)
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fat_loss_calculation_pure_fat() {
        // Arrange
        let kcal_deficit = 7000.0;
        let weight_loss = 1.0;
        
        // Act
        let result = calculate_fat_loss(kcal_deficit, weight_loss);
        
        // Assert
        assert_eq!(result.fat_percentage, 100.0);
        assert_eq!(result.muscle_percentage, 0.0);
    }
}
```

### Frontend Testing (TypeScript)
```typescript
describe('DataProcessor', () => {
  it('should process valid data correctly', async () => {
    // Arrange
    const input = { value: 42 };
    
    // Act
    const result = await processData(input);
    
    // Assert
    expect(result.processed).toBe(true);
    expect(result.value).toBe(42);
  });
});
```

## Documentation Standards

### README Files
- Must include setup instructions
- Document all configuration options
- Provide usage examples
- List prerequisites clearly

### API Documentation
- Document all endpoints
- Include request/response examples
- Describe error codes
- Note authentication requirements

### Code Documentation
- All public APIs must have documentation comments
- Complex algorithms need explanation
- Include examples for non-obvious usage

## Pre-Commit Checklist

Before committing code, ensure:

- [ ] All linting checks pass (`cargo clippy`, `npm run lint`)
- [ ] Code is properly formatted (`cargo fmt`, `npm run lint -- --fix`)
- [ ] No trailing whitespace or blank line violations
- [ ] All tests pass
- [ ] No debug code or console.logs in production code
- [ ] No commented-out code blocks
- [ ] All TODOs have issue numbers or justification
- [ ] Documentation is updated if needed
- [ ] Commit message follows conventional commits format

## CI/CD Enforcement

All these rules are enforced in CI/CD:
- Linting failures will block merges
- Test failures will block merges
- Formatting issues will block merges
- Coverage below threshold will block merges

**There are no exceptions to these rules in CI/CD.**

## Getting Help

If you're unsure about:
- How to fix a linting error → Check the tool's documentation
- How to refactor complex code → Ask in code review
- Whether a comment is needed → When in doubt, add it
- If your code meets standards → Request a review

## Continuous Improvement

These rules evolve over time. If you find:
- A rule that doesn't make sense
- A missing rule that would improve code quality
- A better way to enforce standards

Open an issue or discussion to propose changes!

---

**Remember**: These rules exist to make the codebase maintainable and enjoyable to work with. They are not arbitrary restrictions but lessons learned from experience. Following them makes everyone's life easier, including your future self! 🚀
