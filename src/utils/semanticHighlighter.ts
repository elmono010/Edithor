// Semantic Highlighter Engine for 50+ Languages
// Supports double-pass semantic analysis, variable declarations, parameters, functions, classes, keywords, controls, and error detection.

export interface HighlightTheme {
  name: string;
  isDark: boolean;
  background: string;
  foreground: string;
  gutterBg: string;
  gutterFg: string;
  caret: string;
  comment: string;
  string: string;
  number: string;
  keyword: string;       // declarations (const, let, function, etc)
  controlFlow: string;   // branch statements (if, return, await, try)
  function: string;
  typeClass: string;
  variable: string;
  parameter: string;
  decorator: string;
  operator: string;
  error: string;
}

// 6 beautiful pre-configured themes
export const PRESET_THEMES: HighlightTheme[] = [
  {
    name: "One Dark Pro",
    isDark: true,
    background: "#0f111a",
    foreground: "#abb2bf",
    gutterBg: "#0b0c13",
    gutterFg: "#4b5263",
    caret: "#528bff",
    comment: "#5c6370",
    string: "#98c379",
    number: "#d19a66",
    keyword: "#e06c75",
    controlFlow: "#c678dd",
    function: "#61afef",
    typeClass: "#e5c07b",
    variable: "#e06c75",
    parameter: "#abb2bf",
    decorator: "#d19a66",
    operator: "#56b6c2",
    error: "#f44747"
  },
  {
    name: "Dracula Retro",
    isDark: true,
    background: "#1e1e24",
    foreground: "#f8f8f2",
    gutterBg: "#17171d",
    gutterFg: "#6272a4",
    caret: "#ff79c6",
    comment: "#6272a4",
    string: "#f1fa8c",
    number: "#bd93f9",
    keyword: "#ff79c6",
    controlFlow: "#8be9fd",
    function: "#50fa7b",
    typeClass: "#ffb86c",
    variable: "#ff5555",
    parameter: "#f8f8f2",
    decorator: "#f1fa8c",
    operator: "#ff79c6",
    error: "#ff5555"
  },
  {
    name: "Monokai Retro",
    isDark: true,
    background: "#131313",
    foreground: "#f8f8f2",
    gutterBg: "#0e0e0e",
    gutterFg: "#75715e",
    caret: "#f8f8f0",
    comment: "#75715e",
    string: "#e6db74",
    number: "#ae81ff",
    keyword: "#f92672",
    controlFlow: "#66d9ef",
    function: "#a6e22e",
    typeClass: "#fd971f",
    variable: "#f8f8f2",
    parameter: "#fd971f",
    decorator: "#a6e22e",
    operator: "#f92672",
    error: "#f92672"
  },
  {
    name: "Synthwave '84",
    isDark: true,
    background: "#2b213a",
    foreground: "#ffd3ea",
    gutterBg: "#221a2e",
    gutterFg: "#816d9b",
    caret: "#fede5d",
    comment: "#848bb3",
    string: "#fede5d",
    number: "#f97e72",
    keyword: "#fede5d",
    controlFlow: "#36f9f6",
    function: "#fe4450",
    typeClass: "#36f9f6",
    variable: "#ffd3ea",
    parameter: "#fe4450",
    decorator: "#ffd3ea",
    operator: "#36f9f6",
    error: "#fe4450"
  },
  {
    name: "Matrix Hack",
    isDark: true,
    background: "#020803",
    foreground: "#22eb33",
    gutterBg: "#010401",
    gutterFg: "#158b20",
    caret: "#39ff14",
    comment: "#0f5a14",
    string: "#87f18d",
    number: "#22eb33",
    keyword: "#12ca20",
    controlFlow: "#39ff14",
    function: "#39ff14",
    typeClass: "#22eb33",
    variable: "#22eb33",
    parameter: "#22eb33",
    decorator: "#87f18d",
    operator: "#39ff14",
    error: "#ff0033"
  },
  {
    name: "GitHub Light",
    isDark: false,
    background: "#ffffff",
    foreground: "#24292e",
    gutterBg: "#f6f8fa",
    gutterFg: "#959da5",
    caret: "#0366d6",
    comment: "#6a737d",
    string: "#032f62",
    number: "#005cc5",
    keyword: "#d73a49",
    controlFlow: "#e36209",
    function: "#6f42c1",
    typeClass: "#6f42c1",
    variable: "#24292e",
    parameter: "#e36209",
    decorator: "#22863a",
    operator: "#d73a49",
    error: "#cb2431"
  }
];

export interface SemanticToken {
  text: string;
  type: keyof Omit<HighlightTheme, "name" | "isDark" | "background" | "foreground" | "gutterBg" | "gutterFg" | "caret">;
  isErrorLine?: boolean;
}

// Map file extensions to normalized grammar families (supporting 50+ extensions)
export function detectLanguageByExtension(fileName: string): { name: string, family: string } {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  
  const mapping: { [key: string]: { name: string, family: string } } = {
    // JavaScript family
    js: { name: "JavaScript", family: "js" },
    mjs: { name: "JavaScript ESP", family: "js" },
    cjs: { name: "JavaScript CJS", family: "js" },
    jsx: { name: "React JSX", family: "js" },
    // TypeScript family
    ts: { name: "TypeScript", family: "ts" },
    tsx: { name: "React TSX", family: "ts" },
    // Python family
    py: { name: "Python", family: "py" },
    pyw: { name: "Python GUI", family: "py" },
    // Web
    html: { name: "HTML", family: "html" },
    htm: { name: "HTML", family: "html" },
    xml: { name: "XML", family: "html" },
    svg: { name: "SVG Vector", family: "html" },
    css: { name: "CSS", family: "css" },
    scss: { name: "SASS / SCSS", family: "css" },
    less: { name: "LESS Styling", family: "css" },
    // Systems
    c: { name: "C Language", family: "c" },
    h: { name: "C Header", family: "c" },
    cpp: { name: "C++", family: "c" },
    hpp: { name: "C++ Header", family: "c" },
    cc: { name: "C++ CC", family: "c" },
    cs: { name: "C# (.NET)", family: "c" },
    java: { name: "Java", family: "java" },
    kt: { name: "Kotlin", family: "java" },
    kts: { name: "Kotlin Script", family: "java" },
    swift: { name: "Swift", family: "java" },
    go: { name: "Go Lang", family: "go" },
    rs: { name: "Rust", family: "rust" },
    zig: { name: "Zig Sys", family: "rust" },
    sol: { name: "Solidity", family: "c" },
    // Data & Configs
    json: { name: "JSON", family: "json" },
    yaml: { name: "YAML", family: "yaml" },
    yml: { name: "YAML Config", family: "yaml" },
    toml: { name: "TOML Markup", family: "yaml" },
    ini: { name: "INI Settings", family: "yaml" },
    // Shell & Scripts
    sh: { name: "Bash Shell", family: "shell" },
    bash: { name: "Bash Script", family: "shell" },
    zsh: { name: "Zsh Script", family: "shell" },
    ps1: { name: "PowerShell", family: "shell" },
    bat: { name: "Batch CMD", family: "shell" },
    cmd: { name: "Batch Script", family: "shell" },
    // Functional & Academics
    hs: { name: "Haskell", family: "java" },
    lhs: { name: "Haskell Lit", family: "java" },
    lua: { name: "Lua Script", family: "py" },
    r: { name: "R Stat", family: "py" },
    dart: { name: "Dart", family: "ts" },
    pl: { name: "Perl Script", family: "py" },
    pm: { name: "Perl Module", family: "py" },
    rb: { name: "Ruby", family: "py" },
    php: { name: "PHP Web", family: "js" },
    scala: { name: "Scala", family: "java" },
    clj: { name: "Clojure", family: "py" },
    ex: { name: "Elixir", family: "py" },
    exs: { name: "Elixir Script", family: "py" },
    erl: { name: "Erlang", family: "py" },
    groovy: { name: "Groovy Script", family: "java" },
    ml: { name: "OCaml", family: "java" },
    fs: { name: "F# Functional", family: "c" },
    jl: { name: "Julia Data", family: "py" },
    f90: { name: "Fortran 90", family: "c" },
    cob: { name: "COBOL Core", family: "c" },
    pas: { name: "Pascal Engine", family: "c" },
    m: { name: "MATLAB", family: "py" },
    lisp: { name: "LISP Core", family: "py" },
    scm: { name: "Scheme Core", family: "py" },
    pro: { name: "Prolog Logic", family: "py" },
    // Shaders & Scientific
    glsl: { name: "GLSL Shader", family: "c" },
    wgsl: { name: "WGSL Shader", family: "c" },
    tex: { name: "LaTeX Scientific", family: "yaml" },
    // Docs & Builders
    md: { name: "Markdown Documentation", family: "md" },
    feature: { name: "Gherkin Feature", family: "yaml" },
    mk: { name: "Makefile", family: "shell" },
    dockerfile: { name: "Dockerfile", family: "shell" }
  };

  if (fileName.toLowerCase() === "dockerfile") {
    return { name: "Dockerfile", family: "shell" };
  }
  if (fileName.toLowerCase() === "makefile") {
    return { name: "Makefile", family: "shell" };
  }

  return mapping[ext] || { name: "Plain Text", family: "txt" };
}

// 50+ keywords and control structures lists
const JS_KEYWORDS = new Set(["const", "let", "var", "function", "class", "extends", "export", "import", "from", "default", "new", "this", "super", "type", "interface", "enum", "private", "public", "protected", "static", "readonly", "package"]);
const JS_CONTROLS = new Set(["return", "if", "else", "switch", "case", "default", "for", "while", "do", "break", "continue", "async", "await", "try", "catch", "finally", "throw", "in", "of", "instanceof", "typeof"]);

const PY_KEYWORDS = new Set(["def", "class", "import", "from", "as", "lambda", "global", "nonlocal", "del", "pass", "yield", "assert"]);
const PY_CONTROLS = new Set(["if", "elif", "else", "for", "while", "in", "break", "continue", "return", "try", "except", "finally", "raise", "with", "is", "and", "or", "not"]);

const C_KEYWORDS = new Set(["int", "float", "double", "char", "void", "struct", "class", "union", "enum", "typedef", "sizeof", "static", "extern", "const", "volatile", "signed", "unsigned", "long", "short", "inline", "virtual", "public", "private", "protected", "namespace", "using", "template", "typename", "fn"]);
const C_CONTROLS = new Set(["if", "else", "switch", "case", "default", "break", "continue", "for", "while", "do", "goto", "return", "try", "catch", "throw", "new", "delete"]);

const OTHER_KEYWORDS = new Set(["package", "import", "pub", "use", "mod", "struct", "enum", "trait", "impl", "type", "let", "mut", "fn", "interface", "class", "func", "var", "select"]);
const OTHER_CONTROLS = new Set(["if", "else", "match", "loop", "while", "for", "in", "return", "break", "continue", "await", "yield", "async"]);

// High fidelity Lexical & Semantic Tokenizer
export function parseSemanticTokens(code: string, fileName: string): SemanticToken[] {
  const { family } = detectLanguageByExtension(fileName);
  if (!code) return [];

  // Mismatched structural braces logic (Error checking)
  const errors: { [index: number]: boolean } = {};
  const bracketStack: { char: string; index: number }[] = [];
  
  // Track lines to pinpoint errors
  const lines = code.split("\n");

  // Validate brackets
  for (let idx = 0; idx < code.length; idx++) {
    const char = code[idx];
    if (char === "(" || char === "[" || char === "{") {
      bracketStack.push({ char, index: idx });
    } else if (char === ")" || char === "]" || char === "}") {
      const last = bracketStack.pop();
      if (!last) {
        errors[idx] = true;
      } else {
        const mismatch = 
          (char === ")" && last.char !== "(") ||
          (char === "]" && last.char !== "[") ||
          (char === "}" && last.char !== "{");
        if (mismatch) {
          errors[last.index] = true;
          errors[idx] = true;
        }
      }
    }
  }
  // Remaining items in stack are also errors
  while (bracketStack.length > 0) {
    const item = bracketStack.pop()!;
    errors[item.index] = true;
  }

  // Regex lexical builder
  // Captures: 
  // 1. Strings (single, double, template)
  // 2. Comments (inline, block)
  // 3. Numbers 
  // 4. Word/Identifiers 
  // 5. Operators, Punctuations
  const regex = /(\/\/.*|\/\*[\s\S]*?\*\/|#.*|"""[\s\S]*?"""|'''[\s\S]*?'''|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?\b)|([a-zA-Z_$][a-zA-Z0-9_$]*)|([{}()[\]])|([+\-*/%=&|^!~<>:;.,?&]+)|(\s+)|(.)/g;

  const tokens: SemanticToken[] = [];
  let match;
  let lastIndex = 0;

  // Track declarations to parse local variable semantics
  const declaredVariables = new Set<string>();
  const declaredClasses = new Set<string>();

  // Temporary container to parse semantic relationships
  const rawParsed: { text: string; index: number; type: string }[] = [];

  while ((match = regex.exec(code)) !== null) {
    const stringOrComment = match[1];
    const number = match[2];
    const word = match[3];
    const bracket = match[4];
    const operator = match[5];
    const spacing = match[6];
    const rest = match[7];
    const index = match.index;

    if (stringOrComment) {
      const isComment = stringOrComment.startsWith("//") || stringOrComment.startsWith("/*") || stringOrComment.startsWith("#") || stringOrComment.startsWith("'''") || stringOrComment.startsWith("\"\"\"");
      rawParsed.push({ text: stringOrComment, index, type: isComment ? "comment" : "string" });
    } else if (number) {
      rawParsed.push({ text: number, index, type: "number" });
    } else if (word) {
      rawParsed.push({ text: word, index, type: "word" });
    } else if (bracket) {
      rawParsed.push({ text: bracket, index, type: "bracket" });
    } else if (operator) {
      rawParsed.push({ text: operator, index, type: "operator" });
    } else if (spacing) {
      rawParsed.push({ text: spacing, index, type: "spacing" });
    } else if (rest) {
      rawParsed.push({ text: rest, index, type: "rest" });
    }
  }

  // Second Pass: Semantic analysis
  for (let i = 0; i < rawParsed.length; i++) {
    const item = rawParsed[i];
    
    // Check if error is in this range
    let hasError = false;
    for (let offset = 0; offset < item.text.length; offset++) {
      if (errors[item.index + offset]) {
        hasError = true;
        break;
      }
    }

    if (hasError) {
      tokens.push({ text: item.text, type: "error" });
      continue;
    }

    if (item.type !== "word") {
      // Direct assignments
      if (item.type === "bracket") {
        tokens.push({ text: item.text, type: "operator" });
      } else if (item.type === "spacing" || item.type === "rest") {
        tokens.push({ text: item.text, type: "parameter" as any }); // neutral text fallback
      } else {
        tokens.push({ text: item.text, type: item.type as any });
      }
      continue;
    }

    const val = item.text;

    // Decorators / annotations check: starts with @
    if (val.startsWith("@") || (i > 0 && rawParsed[i-1].text === "@")) {
      tokens.push({ text: val, type: "decorator" });
      continue;
    }

    // Determine paradigm keyword lookup
    let currentKeywords = OTHER_KEYWORDS;
    let currentControls = OTHER_CONTROLS;

    if (family === "js" || family === "ts") {
      currentKeywords = JS_KEYWORDS;
      currentControls = JS_CONTROLS;
    } else if (family === "py") {
      currentKeywords = PY_KEYWORDS;
      currentControls = PY_CONTROLS;
    } else if (family === "c" || family === "java") {
      currentKeywords = C_KEYWORDS;
      currentControls = C_CONTROLS;
    }

    // 1. Language keyword declarations
    if (currentKeywords.has(val)) {
      tokens.push({ text: val, type: "keyword" });
      // Track variable definitions (e.g. `const myVar`, `let myVar`)
      if (val === "const" || val === "let" || val === "var" || val === "def" || val === "fn") {
        let nIdx = i + 1;
        while (nIdx < rawParsed.length && rawParsed[nIdx].type === "spacing") {
          nIdx++;
        }
        if (nIdx < rawParsed.length && rawParsed[nIdx].type === "word") {
          declaredVariables.add(rawParsed[nIdx].text);
        }
      }
      // Track classes definitions
      if (val === "class" || val === "interface" || val === "struct" || val === "enum") {
        let nIdx = i + 1;
        while (nIdx < rawParsed.length && rawParsed[nIdx].type === "spacing") {
          nIdx++;
        }
        if (nIdx < rawParsed.length && rawParsed[nIdx].type === "word") {
          declaredClasses.add(rawParsed[nIdx].text);
        }
      }
      continue;
    }

    // 2. Language branching/control Flow
    if (currentControls.has(val)) {
      tokens.push({ text: val, type: "controlFlow" });
      continue;
    }

    // 3. Class/Type naming convention (Starts with uppercase, or after class keywords)
    if (declaredClasses.has(val) || (/^[A-Z][a-zA-Z0-9_]*$/.test(val) && family !== "py")) {
      tokens.push({ text: val, type: "typeClass" });
      continue;
    }

    // 4. Functions (Invocations or declarations)
    // Invocation: word followed by spacer? and then '('
    let isFn = false;
    let nextIdx = i + 1;
    while (nextIdx < rawParsed.length && rawParsed[nextIdx].type === "spacing") {
      nextIdx++;
    }
    if (nextIdx < rawParsed.length && rawParsed[nextIdx].text === "(") {
      isFn = true;
    }
    
    if (isFn) {
      tokens.push({ text: val, type: "function" });
      continue;
    }

    // Is it declared as variable left-hand side or tracking?
    if (declaredVariables.has(val)) {
      tokens.push({ text: val, type: "variable" });
      continue;
    }

    // Check if within parameters of a function signature
    // Simplified: Find backward declaration "def" or "function" within same line
    let isParam = false;
    let bIdx = i - 1;
    while (bIdx >= 0) {
      if (rawParsed[bIdx].text === "\n") break;
      if (rawParsed[bIdx].text === "function" || rawParsed[bIdx].text === "def" || rawParsed[bIdx].text === "fn") {
        isParam = true;
        break;
      }
      bIdx--;
    }

    if (isParam) {
      tokens.push({ text: val, type: "parameter" });
      continue;
    }

    // Fallback: Default Variable semantic scope
    tokens.push({ text: val, type: "variable" });
  }

  return tokens;
}

// Custom theme JSON Validation and parsing helper
export function importThemeJson(jsonStr: string): HighlightTheme | null {
  try {
    const raw = JSON.parse(jsonStr);
    const requiredKeys: (keyof HighlightTheme)[] = [
      "name", "isDark", "background", "foreground", "gutterBg", "gutterFg", 
      "comment", "string", "number", "keyword", "controlFlow", 
      "function", "typeClass", "variable", "parameter", "decorator", "operator", "error"
    ];

    for (const key of requiredKeys) {
      if (!(key in raw)) {
        return null;
      }
    }
    return {
      ...raw,
      caret: raw.caret || raw.controlFlow || "#38bdf8"
    };
  } catch {
    return null;
  }
}

export function exportThemeJson(theme: HighlightTheme): string {
  return JSON.stringify(theme, null, 2);
}
