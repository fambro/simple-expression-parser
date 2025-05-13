/*
 BNF:
 <expressions> ::= <e> EOF
 <e> ::= <e> "and" <e>
       | <e> "==" <e>
       | <e> "!=" <e>
       | <e> "<" <e>
       | <e> "<=" <e>
       | <e> ">" <e>
       | <e> ">=" <e>
       | NUMBER
       | STRING
       | BOOLEAN
       | VARIABLE

TOKEN DEFINITIONS:
NUMBER: /^(?:[0-9]+(?:\.[0-9]+)?\b)/
STRING: /^(?:"(?:[^"])*")/ (le virgolette vengono rimosse nel valore)
BOOLEAN: /^(?:true|false)/
VARIABLE: /^(binaryblob|boolean|datetime|longinteger_value|integer|longinteger|string)(array)?_value$/
*/

interface Token {
  type: string;
  value: any;
}

// Optimized tokenizer using the 'y' (sticky) flag on regexes to improve performance and avoid repeated string slicing.
const TOKEN_DEFINITIONS = new Map<string, RegExp>([
  ["WHITESPACE", /\s+/y],
  ["NUMBER", /(?:[0-9]+(?:\.[0-9]+)?\b)/y],
  ["STRING", /"([^"]*)"/y],
  ["BOOLEAN", /(?:true|false)\b/y],
  [
    "VARIABLE",
    /(binaryblob|boolean|datetime|double|integer|longinteger|string)(array)?_value\b/y,
  ],
  ["AND", /(?:and|AND)\b/y],
  ["EQ", /==/y],
  ["NEQ", /!=/y],
  ["LTE", /<=/y],
  ["LT", /</y],
  ["GTE", />=/y],
  ["GT", />/y],
  ["LPAREN", /\(/y],
  ["RPAREN", /\)/y],
]);

const TOKEN_ORDER = [
  "WHITESPACE",
  "LTE",
  "GTE",
  "EQ",
  "NEQ",
  "LT",
  "GT",
  "AND",
  "BOOLEAN",
  "VARIABLE",
  "NUMBER",
  "STRING",
  "LPAREN",
  "RPAREN",
];

function createTokenDefinitionsWithVariable(variableRegexp: RegExp) {
  return new Map<string, RegExp>([
    ["WHITESPACE", /\s+/y],
    ["NUMBER", /(?:[0-9]+(?:\.[0-9]+)?\b)/y],
    ["STRING", /"([^"]*)"/y],
    ["BOOLEAN", /(?:true|false)\b/y],
    [
      "VARIABLE", variableRegexp
    ],
    ["AND", /(?:and|AND)\b/y],
    ["EQ", /==/y],
    ["NEQ", /!=/y],
    ["LTE", /<=/y],
    ["LT", /</y],
    ["GTE", />=/y],
    ["GT", />/y],
    ["LPAREN", /\(/y],
    ["RPAREN", /\)/y],
  ]);
}

export function tokenize(input: string, options?: { variableRegexp: RegExp}): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  const TokenDefinitions = options && options.variableRegexp
    ? createTokenDefinitionsWithVariable(options.variableRegexp) : TOKEN_DEFINITIONS;

  while (pos < input.length) {
    let matchedThisIteration = false;

    for (const type of TOKEN_ORDER) {
      const regex = TokenDefinitions.get(type);
      if (!regex) {
        throw new Error(`Missing regex: ${type}`);
      }

      // Position for next match!
      regex.lastIndex = pos;

      const match = regex.exec(input);

      if (match !== null) {
        const matchedText = match[0];

        if (type !== "WHITESPACE") {
          let value: any = matchedText;
          if (type === "STRING" && match[1] !== undefined) {
            value = match[1];
          }
          tokens.push({ type, value });
        }

        pos += matchedText.length;
        matchedThisIteration = true;
        break;
      }
    }

    if (!matchedThisIteration) {
      throw new Error(
        `Token error ${pos}: "${input.substring(pos, pos + 10)}..."`
      );
    }
  }

  return tokens;
}

export function parseExpression(input: string, options?: { variableRegexp: RegExp}) {
  input = input.trim();

  const tokens = tokenize(input, options);
  let pos = 0;

  function parse() {
    if (tokens.length === 0) return { valid: false, error: "Input vuoto" };

    try {
      const ast = parseExpr();
      if (pos < tokens.length) {
        throw new Error(
          `Unxpected token after the end of expression: ${tokens[pos].type}`
        );
      }
      return { valid: true, ast };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }

  function parseExpr() {
    return parseComparison();
  }

  function parseComparison() {
    let left = parseEquality();

    while (pos < tokens.length && tokens[pos].type === "AND") {
      const operator = tokens[pos].type;
      pos++;
      const right = parseEquality();

      left = {
        type: "BinaryExpression",
        operator,
        left,
        right,
      };
    }

    return left;
  }

  function parseEquality() {
    let left = parseRelational();

    while (
      pos < tokens.length &&
      (tokens[pos].type === "EQ" || tokens[pos].type === "NEQ")
    ) {
      const operator = tokens[pos].type;
      pos++;
      const right = parseRelational();

      left = {
        type: "BinaryExpression",
        operator,
        left,
        right,
      };
    }

    return left;
  }

  function parseRelational() {
    let left = parsePrimary();

    while (
      pos < tokens.length &&
      (tokens[pos].type === "LT" ||
        tokens[pos].type === "LTE" ||
        tokens[pos].type === "GT" ||
        tokens[pos].type === "GTE")
    ) {
      const operator = tokens[pos].type;
      pos++;
      const right = parsePrimary();

      left = {
        type: "BinaryExpression",
        operator,
        left,
        right,
      };
    }

    return left;
  }

  function parsePrimary(): {
    type: string;
    value?: any;
    operator?: string;
    left?: any;
    right?: any;
  } {
    if (pos >= tokens.length) {
      throw new Error("Unexpected end of input");
    }

    const token = tokens[pos];

    if (token.type === "LPAREN") {
      pos++;
      const expr = parseExpr();

      if (pos >= tokens.length || tokens[pos].type !== "RPAREN") {
        throw new Error("Expected closing parenthesis");
      }
      pos++;

      return expr;
    }

    pos++;

    switch (token.type) {
      case "NUMBER":
        return { type: "Number", value: parseFloat(token.value as string) };
      case "STRING":
        return { type: "String", value: token.value };
      case "BOOLEAN":
        return { type: "Boolean", value: token.value === "true" };
      case "VARIABLE":
        return { type: "VARIABLE", value: token.value };
      default:
        throw new Error(`Unexpected token: ${token.type}`);
    }
  }

  return parse();
}

export function createParser(options: { variableRegexp: RegExp }) {
  return (input: string) => parseExpression(input, options);
}