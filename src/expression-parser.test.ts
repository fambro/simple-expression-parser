// expression-parser.test.ts
import { describe, it, expect } from 'vitest';
import { tokenize, parseExpression } from './expression-parser';

describe('Tokenizer', () => {
  describe('basic tokens', () => {
    it('should tokenize numbers', () => {
      const tokens = tokenize('42 3.14');
      expect(tokens).toEqual([
        { type: 'NUMBER', value: '42' },
        { type: 'NUMBER', value: '3.14' }
      ]);
    });

    it('should tokenize strings', () => {
      const tokens = tokenize('"hello" "world"');
      expect(tokens).toEqual([
        { type: 'STRING', value: 'hello' },
        { type: 'STRING', value: 'world' }
      ]);
    });

    it('should tokenize booleans', () => {
      const tokens = tokenize('true false');
      expect(tokens).toEqual([
        { type: 'BOOLEAN', value: 'true' },
        { type: 'BOOLEAN', value: 'false' }
      ]);
    });

    it('should tokenize variables', () => {
      const tokens = tokenize('double_value stringarray_value');
      expect(tokens).toEqual([
        { type: 'VARIABLE', value: 'double_value' },
        { type: 'VARIABLE', value: 'stringarray_value' }
      ]);
    });
  });

  describe('operators', () => {
    it('should tokenize comparison operators', () => {
      const tokens = tokenize('< <= > >= == !=');
      expect(tokens).toEqual([
        { type: 'LT', value: '<' },
        { type: 'LTE', value: '<=' },
        { type: 'GT', value: '>' },
        { type: 'GTE', value: '>=' },
        { type: 'EQ', value: '==' },
        { type: 'NEQ', value: '!=' }
      ]);
    });

    it('should tokenize AND operator (lowercase)', () => {
      const tokens = tokenize('integer_value and boolean_value');
      expect(tokens).toEqual([
        { type: 'VARIABLE', value: 'integer_value' },
        { type: 'AND', value: 'and' },
        { type: 'VARIABLE', value: 'boolean_value' }
      ]);
    });

    it('should tokenize AND operator (uppercase)', () => {
      const tokens = tokenize('integer_value AND integer_value');
      expect(tokens).toEqual([
        { type: 'VARIABLE', value: 'integer_value' },
        { type: 'AND', value: 'AND' },
        { type: 'VARIABLE', value: 'integer_value' }
      ]);
    });
  });

  describe('parentheses', () => {
    it('should tokenize parentheses', () => {
      const tokens = tokenize('(integer_value)');
      expect(tokens).toEqual([
        { type: 'LPAREN', value: '(' },
        { type: 'VARIABLE', value: 'integer_value' },
        { type: 'RPAREN', value: ')' }
      ]);
    });

    it('should tokenize nested parentheses', () => {
      const tokens = tokenize('((integer_value))');
      expect(tokens).toEqual([
        { type: 'LPAREN', value: '(' },
        { type: 'LPAREN', value: '(' },
        { type: 'VARIABLE', value: 'integer_value' },
        { type: 'RPAREN', value: ')' },
        { type: 'RPAREN', value: ')' }
      ]);
    });
  });

  describe('complex expressions', () => {
    it('should tokenize complex expression', () => {
      const tokens = tokenize('double_value > 5 and string_value == "test"');
      expect(tokens).toEqual([
        { type: 'VARIABLE', value: 'double_value' },
        { type: 'GT', value: '>' },
        { type: 'NUMBER', value: '5' },
        { type: 'AND', value: 'and' },
        { type: 'VARIABLE', value: 'string_value' },
        { type: 'EQ', value: '==' },
        { type: 'STRING', value: 'test' }
      ]);
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid tokens', () => {
      expect(parseExpression('double_value >> 5').valid).toEqual(false);
    });
  });
});

describe('Expression Parser', () => {
  describe('valid expressions', () => {
    it('should parse simple comparisons', () => {
      const result = parseExpression('double_value > 5');
      expect(result.valid).toBe(true);
      expect(result.ast).toEqual({
        type: 'BinaryExpression',
        operator: 'GT',
        left: { type: 'VARIABLE', value: 'double_value' },
        right: { type: 'Number', value: 5 }
      });
    });

    it('should parse expressions with AND (lowercase)', () => {
      const result = parseExpression('integer_value > 5 and double_value < 10');
      expect(result.valid).toBe(true);
      expect(result.ast?.operator).toBe('AND');
    });

    it('should parse expressions with AND (uppercase)', () => {
      const result = parseExpression('integer_value > 5 AND double_value < 10');
      expect(result.valid).toBe(true);
      expect(result.ast?.operator).toBe('AND');
    });

    it('should parse expressions with parentheses', () => {
      const result = parseExpression('(integer_value > 5) and (double_value < 10)');
      expect(result.valid).toBe(true);
    });

    it('should parse nested parentheses', () => {
      const result = parseExpression('((integer_value > 5) and (double_value < 10)) and boolean_value == true');
      expect(result.valid).toBe(true);
    });

    it('should parse all variable types', () => {
      const variableTypes = [
        'binaryblob_value',
        'boolean_value',
        'datetime_value',
        'double_value',
        'integer_value',
        'longinteger_value',
        'string_value',
        'stringarray_value',
        'booleanarray_value'
      ];

      variableTypes.forEach(varType => {
        const result = parseExpression(`${varType} > 5`);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('invalid expressions', () => {
    it('should reject empty input', () => {
      const result = parseExpression('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Input vuoto');
    });

    it('should reject unmatched opening parenthesis', () => {
      const result = parseExpression('(integer_value > 5');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Expected closing parenthesis');
    });

    it('should reject unmatched closing parenthesis', () => {
      const result = parseExpression('integer_value > 5)');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unxpected token');
    });

    it('should reject invalid operators', () => {
      const result = parseExpression('integer_value >> 5');
      expect(result.valid).toBe(false);
    });

    it('should reject incomplete expressions', () => {
      const result = parseExpression('integer_value >');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unexpected end of input');
    });

    it('should reject expressions with trailing tokens', () => {
      const result = parseExpression('integer_value > 5 integer_value');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unxpected token');
    });
  });

  describe('operator precedence', () => {
    it('should respect parentheses precedence', () => {
      const result1 = parseExpression('integer_value == 5 and longinteger_value > 3 and double_value < 10');
      const result2 = parseExpression('integer_value == 5 and (longinteger_value > 3 and double_value < 10)');
      
      // Without parentheses: ((a == 5) and (b > 3)) and (c < 10)
      // With parentheses: (a == 5) and ((b > 3) and (c < 10))
      expect(result1.ast).not.toEqual(result2.ast);
    });

    it('should parse left-associative AND operations', () => {
      const result = parseExpression('integer_value > 1 and longinteger_value > 2 and double_value > 3');
      expect(result.valid).toBe(true);
      
      // Should be parsed as ((a > 1) and (b > 2)) and (c > 3)
      expect(result.ast?.operator).toBe('AND');
      expect(result.ast?.left.operator).toBe('AND');
    });
  });

  describe('edge cases', () => {
    it('should handle whitespace correctly', () => {
      const result = parseExpression('   integer_value   >   5   ');
      expect(result.valid).toBe(true);
    });

    it('should parse string with spaces', () => {
      const result = parseExpression('string_value == "hello world"');
      expect(result.valid).toBe(true);
      expect(result.ast?.right.value).toBe('hello world');
    });

    it('should parse boolean literals correctly', () => {
      const result = parseExpression('boolean_value == true');
      expect(result.valid).toBe(true);
      expect(result.ast?.right.value).toBe(true);
    });

    it('should parse floating point numbers', () => {
      const result = parseExpression('double_value > 3.14159');
      expect(result.valid).toBe(true);
      expect(result.ast?.right.value).toBe(3.14159);
    });
  });
});