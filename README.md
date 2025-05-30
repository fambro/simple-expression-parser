# Simple Expression Parser

A lightweight parser for boolean expressions and simple comparisons. This package provides tools to tokenize and parse expressions according to a specific grammar, with support for customizable variable patterns.

## Grammar

The parser supports the following grammar:

```
BNF:
 <expressions> ::= <e> EOF
 <e> ::= <e> "and" <e>
       | <e> "==" <e>
       | <e> "!=" <e>
       | <e> "<" <e>
       | <e> "<=" <e>
       | <e> ">" <e>
       | <e> ">=" <e>
       | "(" <e> ")"
       | NUMBER
       | STRING
       | BOOLEAN
       | VARIABLE
```

### Token Definitions

```
NUMBER: /^(?:[0-9]+(?:\.[0-9]+)?\b)/
STRING: /^(?:"(?:[^"])*")/ (quotes are removed in the value)
BOOLEAN: /^(?:true|false)/
VARIABLE: By default, /^(binaryblob|boolean|datetime|double|integer|longinteger|string)(array)?_value\b/y
LPAREN: /\(/y
RPAREN: /\)/y
```

## Usage

### Basic Parsing

```typescript
import { parseExpression } from 'simple-expression-parser';

// Parse a simple expression
const result = parseExpression('string_value == "hello" and integer_value > 42');

if (result.valid) {
  console.log('Valid expression!');
  console.log(result.ast);
} else {
  console.error('Invalid expression:', result.error);
}
```

### Custom Variable Pattern

You can customize the variable pattern recognition with the `createParser` function:

```typescript
import { createParser } from 'simple-expression-parser';

// Create a parser that recognizes custom field patterns
const customParser = createParser({
  variableRegexp: /[a-z]+\.[a-z]+\b/y
});

// Use the custom parser
const result = customParser('user.age > 18 and user.active == true');

if (result.valid) {
  console.log('Valid expression with custom variables!');
  console.log(result.ast);
}
```

### Direct Tokenization

If you need access to the tokenization step:

```typescript
import { tokenize } from 'simple-expression-parser';

const tokens = tokenize('integer_value == 42');
console.log(tokens);
// Output: [
//   { type: 'VARIABLE', value: 'integer_value' },
//   { type: 'EQ', value: '==' },
//   { type: 'NUMBER', value: '42' }
// ]
```

## AST Structure

The parser generates an Abstract Syntax Tree (AST) representing the expression structure. For example:

```typescript
// For the expression: string_value == "test" and integer_value > 10
{
  type: 'BinaryExpression',
  operator: 'AND',
  left: {
    type: 'BinaryExpression',
    operator: 'EQ',
    left: { type: 'VARIABLE', value: 'string_value' },
    right: { type: 'String', value: 'test' }
  },
  right: {
    type: 'BinaryExpression',
    operator: 'GT',
    left: { type: 'VARIABLE', value: 'integer_value' },
    right: { type: 'Number', value: 10 }
  }
}
```

### Examples

### Database Query Conditions

```typescript
const dbParser = createParser({
  variableRegexp: /db\.[a-z]+\.[a-z]+\b/y
});

const result = dbParser('db.users.age > 18 and db.users.active == true');
```

### Form Validation

```typescript
const formParser = createParser({
  variableRegexp: /form\.[a-z]+\b/y
});

const validationExpression = 'form.email != "" and form.age >= 18';
// Group validations with parentheses
const complexValidation = 'form.email != "" and (form.age >= 18 or form.parentConsent == true)';
const result = formParser(validationExpression);
// Use the AST to validate form inputs
```

## License

MIT
