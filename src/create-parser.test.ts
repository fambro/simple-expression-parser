import { describe, it, expect } from 'vitest';
import { createParser, parseExpression, tokenize } from './expression-parser';

describe('createParser', () => {
  // Test to verify that createParser correctly creates a parser with a custom regex
  it('should create a parser with a custom regex for VARIABLE', () => {
    // Create a parser that only accepts variables starting with "custom_"
    const customParser = createParser({ variableRegexp: /custom_[a-z]+\b/y });
    
    // Verify that the parser correctly recognizes custom variables
    const result = customParser('custom_test == 10');
    
    expect(result.valid).toBe(true);
    expect(result.ast).toEqual({
      type: 'BinaryExpression',
      operator: 'EQ',
      left: { type: 'VARIABLE', value: 'custom_test' },
      right: { type: 'Number', value: 10 }
    });
  });
  
  // Test that verifies that the custom parser rejects variables that don't match the regex
  it('should reject variables that do not match the custom regex', () => {
    const customParser = createParser({ variableRegexp: /custom_[a-z]+\b/y });
    
    // This should fail because "string_value" doesn't match our custom regex
    expect(() => customParser('string_value == "test"')).toThrow();
  });
  
  // Test that verifies that the default parser accepts standard variables
  it('should accept standard variables when using parseExpression', () => {
    const result = parseExpression('string_value == "test"');
    
    expect(result.valid).toBe(true);
    expect(result.ast).toEqual({
      type: 'BinaryExpression',
      operator: 'EQ',
      left: { type: 'VARIABLE', value: 'string_value' },
      right: { type: 'String', value: 'test' }
    });
  });
  
  // Test that verifies the integration of custom regex with parseExpression
  it('should accept custom regex when passed to parseExpression', () => {
    const result = parseExpression('my_custom_var == true', {
      variableRegexp: /my_custom_[a-z]+\b/y
    });
    
    expect(result.valid).toBe(true);
    expect(result.ast).toEqual({
      type: 'BinaryExpression',
      operator: 'EQ',
      left: { type: 'VARIABLE', value: 'my_custom_var' },
      right: { type: 'Boolean', value: true }
    });
  });
  
  // Test for more complex expressions with custom variables
  it('should handle complex expressions with custom variables', () => {
    const customParser = createParser({
      variableRegexp: /[a-z]+_field\b/y
    });
    
    const result = customParser('(name_field == "Mario") AND (age_field > 25)');
    
    expect(result.valid).toBe(true);
    // Verify the nested structure of the AST
    expect(result.ast).toEqual({
      type: 'BinaryExpression',
      operator: 'AND',
      left: {
        type: 'BinaryExpression',
        operator: 'EQ',
        left: { type: 'VARIABLE', value: 'name_field' },
        right: { type: 'String', value: 'Mario' }
      },
      right: {
        type: 'BinaryExpression',
        operator: 'GT',
        left: { type: 'VARIABLE', value: 'age_field' },
        right: { type: 'Number', value: 25 }
      }
    });
  });
  
  // Test that verifies that tokenize accepts custom regex
  it('should tokenize correctly with custom regex', () => {
    const tokens = tokenize('custom_field == 42', {
      variableRegexp: /custom_[a-z]+\b/y
    });
    
    expect(tokens).toEqual([
      { type: 'VARIABLE', value: 'custom_field' },
      { type: 'EQ', value: '==' },
      { type: 'NUMBER', value: '42' }
    ]);
  });
});

// Additional tests for realistic use cases
describe('Realistic use cases', () => {
  it('should handle a use case with database fields', () => {
    // Simulate a parser for database fields
    const dbParser = createParser({
      variableRegexp: /db\.[a-z]+\.[a-z]+\b/y
    });
    
    const result = dbParser('db.users.age > 18 AND db.users.active == true');
    
    expect(result.valid).toBe(true);
    expect(result.ast).toEqual({
      type: 'BinaryExpression',
      operator: 'AND',
      left: {
        type: 'BinaryExpression',
        operator: 'GT',
        left: { type: 'VARIABLE', value: 'db.users.age' },
        right: { type: 'Number', value: 18 }
      },
      right: {
        type: 'BinaryExpression',
        operator: 'EQ',
        left: { type: 'VARIABLE', value: 'db.users.active' },
        right: { type: 'Boolean', value: true }
      }
    });
  });
  
  it('should handle variables with different formats', () => {
    // Parser that accepts both snake_case and camelCase fields
    const mixedParser = createParser({
      variableRegexp: /([a-z]+_[a-z]+|[a-z]+[A-Z][a-z]+)\b/y
    });
    
    const result1 = mixedParser('user_name == "Mario"');
    const result2 = mixedParser('userName == "Mario"');
    
    expect(result1.valid).toBe(true);
    expect(result2.valid).toBe(true);
  });
});