// Language Server Protocol & IntelliSense Autocomplete Engine
// Performs live static analysis of code to determine variable types, object shapes, classes, imports, and provides contextual autocomplete.

import { DiagnosticItem } from "../types";

export type CompletionKind = "method" | "property" | "variable" | "keyword" | "snippet" | "class" | "interface" | "type" | "function";

export interface CompletionItem {
  label: string;
  kind: CompletionKind;
  detail: string;       // Typings/signature (e.g. "(method) Array.map<T>(callbackfn: ...): T[]")
  documentation?: string; // Markdown or plain text description
  insertText: string;   // Clean code or snippet template with tab-stops e.g. "map(item => $0)"
}

export interface TypeDef {
  typeName: string;
  props: { [key: string]: { kind: CompletionKind; detail: string; doc?: string; insert?: string } };
}

// Built-in JS/TS types and common global shapes
const GLOBAL_TYPES: { [key: string]: TypeDef } = {
  "Array": {
    typeName: "Array",
    props: {
      "length": { kind: "property", detail: "number", doc: "Indica la cantidad de elementos en el array." },
      "push": { kind: "method", detail: "(...items: any[]): number", doc: "Añade nuevos elementos al final de la colección y devuelve la longitud nueva.", insert: "push($0)" },
      "pop": { kind: "method", detail: "(): any", doc: "Elimina el último elemento de un array y lo devuelve." },
      "map": { kind: "method", detail: "(callback: (value: any, index: number) => any): any[]", doc: "Crea un nuevo array con los resultados de la llamada a la función provista.", insert: "map(item => $0)" },
      "filter": { kind: "method", detail: "(callback: (value: any, index: number) => boolean): any[]", doc: "Filtra elementos que cumplan con la condición.", insert: "filter(item => $0)" },
      "forEach": { kind: "method", detail: "(callback: (value: any) => void): void", doc: "Ejecuta una función para cada elemento.", insert: "forEach(item => {\n  $0\n})" },
      "reduce": { kind: "method", detail: "(callback: (acc: any, val: any) => any, initial: any): any", doc: "Reduce el array a un único valor acumulado.", insert: "reduce((acc, curr) => $0, acc)" },
      "find": { kind: "method", detail: "(predicate: (value: any) => boolean): any", doc: "Busca el primer elemento que cumpla la condición." },
      "slice": { kind: "method", detail: "(start?: number, end?: number): any[]", doc: "Extrae una sección del array." },
      "join": { kind: "method", detail: "(separator?: string): string", doc: "Une todos los elementos en un string." }
    }
  },
  "String": {
    typeName: "String",
    props: {
      "length": { kind: "property", detail: "number", doc: "Longitud de la cadena de texto." },
      "toLowerCase": { kind: "method", detail: "(): string", doc: "Convierte a minúsculas.", insert: "toLowerCase()" },
      "toUpperCase": { kind: "method", detail: "(): string", doc: "Convierte a mayúsculas.", insert: "toUpperCase()" },
      "split": { kind: "method", detail: "(separator: string | RegExp, limit?: number): string[]", doc: "Arroja un array de fragmentos separados.", insert: "split('$0')" },
      "trim": { kind: "method", detail: "(): string", doc: "Remueve los espacios vacíos marginales." },
      "replace": { kind: "method", detail: "(pattern: string | RegExp, replacer: string): string", doc: "Reemplaza una ocurrencia.", insert: "replace('$0', '')" },
      "includes": { kind: "method", detail: "(searchString: string, position?: number): boolean", doc: "Evalúa si contiene el fragmento.", insert: "includes($0)" },
      "substring": { kind: "method", detail: "(start: number, end?: number): string", doc: "Extrae un tramo del texto." }
    }
  },
  "Promise": {
    typeName: "Promise",
    props: {
      "then": { kind: "method", detail: "(onfulfilled: (value: any) => any): Promise", doc: "Declara el callback de resolución exitosa.", insert: "then(res => $0)" },
      "catch": { kind: "method", detail: "(onrejected: (reason: any) => any): Promise", doc: "Declara el manejador de fallos de la promesa.", insert: "catch(err => $0)" },
      "finally": { kind: "method", detail: "(onfinally: () => void): Promise", doc: "Callback a computar sin importar el desenlace final.", insert: "finally(() => $0)" }
    }
  },
  "console": {
    typeName: "Console",
    props: {
      "log": { kind: "method", detail: "(...data: any[]): void", doc: "Imprime información legible por consola de diagnóstico estándar.", insert: "log($0)" },
      "error": { kind: "method", detail: "(...data: any[]): void", doc: "Muestra alertas críticas o excepciones en consola.", insert: "error($0)" },
      "warn": { kind: "method", detail: "(...data: any[]): void", doc: "Advierte de posibles ineficiencias o bugs menores.", insert: "warn($0)" },
      "info": { kind: "method", detail: "(...data: any[]): void", doc: "Registra logs catalogados como informativos." },
      "clear": { kind: "method", detail: "(): void", doc: "Limpia la terminal activa." }
    }
  },
  "localStorage": {
    typeName: "Storage",
    props: {
      "getItem": { kind: "method", detail: "(key: string): string | null", doc: "Recupera una clave guardada en el disco del navegador.", insert: "getItem('$0')" },
      "setItem": { kind: "method", detail: "(key: string, value: string): void", doc: "Guarda un par de clave-valor sin vencimiento.", insert: "setItem('$0', )" },
      "removeItem": { kind: "method", detail: "(key: string): void", doc: "Remueve una variable." },
      "clear": { kind: "method", detail: "(): void", doc: "Elimina todas las claves registradas en el origen." }
    }
  }
};

const BASH_UTILS = [
  { label: "git", kind: "keyword", detail: "Control de versiones", doc: "Comando principal para interactuar con repositorios Git." },
  { label: "npm", kind: "keyword", detail: "Gestor de paquetes", doc: "Comandos npm para dependencias (npm install, npm run, etc.)." },
  { label: "curl", kind: "keyword", detail: "Cliente HTTP", doc: "Herramienta de terminal para realizar peticiones HTTP/API." },
  { label: "docker", kind: "keyword", detail: "Contenedores", doc: "Comandos para administrar contenedores y volcados Docker." },
  { label: "ls", kind: "keyword", detail: "Lista directorios", doc: "Muestra los archivos de la ruta actual." }
];

// Language snippets matching common libraries/frameworks
const LANGUAGE_SNIPPETS: { [lang: string]: CompletionItem[] } = {
  "js": [
    { label: "ife", kind: "snippet", detail: "Declaración If-Else", insertText: "if (${1:condition}) {\n  $0\n} else {\n  \n}", documentation: "Crea una estructura de bifurcación condicional estándar." },
    { label: "fn", kind: "snippet", detail: "Función tradicional", insertText: "function ${1:name}(${2:params}) {\n  $0\n}", documentation: "Declara una función con alcance local." },
    { label: "afn", kind: "snippet", detail: "Función flecha (Arrow)", insertText: "const ${1:name} = (${2:params}) => {\n  $0\n};", documentation: "Sintaxis moderna compacta tipo Arrow." },
    { label: "clg", kind: "snippet", detail: "console.log", insertText: "console.log($0);", documentation: "Imprime logs en la consola." },
    { label: "prom", kind: "snippet", detail: "Nueva Promesa", insertText: "new Promise((resolve, reject) => {\n  $1\n})", documentation: "Instancia una operación asíncrona diferida." },
    { label: "try", kind: "snippet", detail: "Estructura Try-Catch", insertText: "try {\n  $1\n} catch (err) {\n  console.error(err);\n}", documentation: "Captura excepciones de tiempo de ejecución de manera segura." }
  ],
  "ts": [
    { label: "interface", kind: "snippet", detail: "Estructura de Interfaz", insertText: "interface ${1:WithName} {\n  ${2:id}: number;\n  $0\n}", documentation: "Define un contrato de formas para tipado seguro TypeScript." },
    { label: "type", kind: "snippet", detail: "Alias de Tipo", insertText: "type ${1:MyType} = {\n  ${2:prop}: string;\n};", documentation: "Asigna un alias estático reutilizable." },
    { label: "react_component", kind: "snippet", detail: "React FC Component", insertText: "import React from 'react';\n\ninterface ${1:MyComponent}Props {\n  title: string;\n}\n\nexport default function ${1:MyComponent}({ title }: ${1:MyComponent}Props) {\n  return (\n    <div className=\"p-4 bg-slate-900 text-white\">\n      <h3>{title}</h3>\n      $0\n    </div>\n  );\n}", documentation: "Genera una plantilla de componente funcional React con tipado estricto." },
    { label: "use_state", kind: "snippet", detail: "React useState Hook", insertText: "const [${1:state}, set${1/^(.)(.*)$/${1:upcase}${2:downcase}/}] = useState($2);", documentation: "Inserta un gancho de estado React." },
    { label: "use_effect", kind: "snippet", detail: "React useEffect Hook", insertText: "useEffect(() => {\n  $0\n}, [${1:deps}]);", documentation: "Efecto secundario reactivo dependiente de variables." }
  ],
  "py": [
    { label: "def_method", kind: "snippet", detail: "Define una Función", insertText: "def ${1:function_name}(self, ${2:args}):\n    \"\"\"${3:docstring}\"\"\"\n    $0", documentation: "Estructura de función con soporte para métodos de clases y comentarios." },
    { label: "class_py", kind: "snippet", detail: "Clase Python", insertText: "class ${1:ClassName}:\n    def __init__(self, ${2:args}):\n        $0", documentation: "Instancia un objeto declarativo con constructor." },
    { label: "main_py", kind: "snippet", detail: "Script Main Wrapper", insertText: "if __name__ == '__main__':\n    $0", documentation: "Permite aislar la ejecución principal del import modular." },
    { label: "try_py", kind: "snippet", detail: "Try-Except bloque", insertText: "try:\n    $1\nexcept Exception as e:\n    print(f\"Ocurrió un error: {e}\")", documentation: "Manejador nativo de errores recursivo." }
  ],
  "html": [
    { label: "html5", kind: "snippet", detail: "Plantilla HTML5", insertText: "<!DOCTYPE html>\n<html lang=\"es\">\n<head>\n  <meta charset=\"UTF-8\">\n  <title>${1:Document}</title>\n</head>\n<body>\n  $0\n</body>\n</html>", documentation: "Maquetación inicial regulada por el consorcio W3C." },
    { label: "script_tag", kind: "snippet", detail: "<script>", insertText: "<script src=\"$1\"></script>", documentation: "Integra scripts lógicos externos." },
    { label: "link_tag", kind: "snippet", detail: "<link css>", insertText: "<link rel=\"stylesheet\" href=\"$1\" />", documentation: "Enlaza estilos distributivos." }
  ]
};

// Quick Language helper dictionary
const LANGUAGE_FAMILIES = {
    js: "js",
    jsx: "js",
    ts: "ts",
    tsx: "ts",
    py: "py",
    html: "html",
    htm: "html",
    xml: "html",
    css: "css",
    scss: "css"
};

// Double-pass parsing logic for LSP simulation
export function getLspCompletions(
  code: string,
  fileName: string,
  cursorIndex: number
): {
  completions: CompletionItem[];
  triggerChar: string | null;
  activeContextText?: string;
  signatureHelp?: { signature: string; activeParameter: number; doc?: string } | null;
} {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const langKey = (LANGUAGE_FAMILIES as any)[ext] || "js";

  // Check cursor context text
  const textBefore = code.substring(0, cursorIndex);
  const textAfter = code.substring(cursorIndex);

  // Parse lines to understand context
  const linesBefore = textBefore.split("\n");
  const currentLine = linesBefore[linesBefore.length - 1] || "";
  
  // Heuristic triggers
  const isDotTrigger = currentLine.endsWith(".");
  const isImportTrigger = currentLine.trim().startsWith("import ");
  const isBracketOpenTrigger = currentLine.endsWith("(");
  
  let triggerChar: string | null = null;
  if (isDotTrigger) triggerChar = ".";
  else if (isImportTrigger) triggerChar = "import";
  else if (isBracketOpenTrigger) triggerChar = "(";

  // Track dynamic environment types extracted from the file
  const localTypes: { [varName: string]: string } = {}; // varName -> TypeName
  const customTypeDefs: { [className: string]: TypeDef } = {}; // className -> specs

  // Analyze the document dynamically (LSP AST Simulation)
  // Look for classes
  const classMatches = code.matchAll(/class\s+([a-zA-Z0-9_$]+)(?:\s+extends\s+([a-zA-Z0-9_$]+))?\s*\{([\s\S]*?)\}/g);
  for (const match of classMatches) {
    const className = match[1];
    const classBody = match[3];

    // Find custom methods inside class
    const methods: { [key: string]: { kind: CompletionKind; detail: string; doc?: string } } = {};
    const methodMatches = classBody.matchAll(/(?:async\s+)?([a-zA-Z0-9_$]+)\s*\(([^)]*)\)\s*(?::\s*([a-zA-Z0-9_$<>]+))?\s*\{/g);
    for (const mMatch of methodMatches) {
      const methodName = mMatch[1];
      const params = mMatch[2] || "";
      const returnType = mMatch[3] || "void";
      
      methods[methodName] = {
        kind: "method",
        detail: `(${className}) ${methodName}(${params}): ${returnType}`,
        doc: `Método de clase '${className}' analizado dinámicamente.`
      };
    }

    // Capture fields/properties
    const fieldMatches = classBody.matchAll(/([a-zA-Z0-9_$]+)\s*(?::\s*([a-zA-Z0-9_$<>]+))?\s*(?:=.*?)?;/g);
    for (const fMatch of fieldMatches) {
      const fieldName = fMatch[1];
      const fieldType = fMatch[2] || "any";
      if (fieldName !== "constructor") {
        methods[fieldName] = {
          kind: "property",
          detail: `(property) ${className}.${fieldName}: ${fieldType}`
        };
      }
    }

    customTypeDefs[className] = {
      typeName: className,
      props: methods as any
    };
  }

  // Look for let/const assignments and map to types
  // Regex 1: Matches Class instantiations: const myUserObj = new MyClientClass();
  const instMatches = code.matchAll(/(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*new\s+([a-zA-Z0-9_$]+)/g);
  for (const match of instMatches) {
    const varName = match[1];
    const typeName = match[2];
    localTypes[varName] = typeName;
  }

  // Regex 2: Matches literal arrays: const files = [...]
  const arrayMatches = code.matchAll(/(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:\[|Array)/g);
  for (const match of arrayMatches) {
    const varName = match[1];
    localTypes[varName] = "Array";
  }

  // Regex 3: Matches literal strings
  const stringMatches = code.matchAll(/(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:"|'|`)/g);
  for (const match of stringMatches) {
    const varName = match[1];
    localTypes[varName] = "String";
  }

  // Regex 4: Matches custom inline object structures: const settings = { host: "ip", port: 80 }
  const objMatches = code.matchAll(/(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*\{([\s\S]*?)\}/g);
  for (const match of objMatches) {
    const varName = match[1];
    const bodyObj = match[2];
    
    const props: { [key: string]: any } = {};
    const propMatches = bodyObj.matchAll(/([a-zA-Z0-9_$]+)\s*:/g);
    for (const pMatch of propMatches) {
      props[pMatch[1]] = { kind: "property", detail: "any (propiedad de objeto)" };
    }
    
    customTypeDefs[`__literal_${varName}`] = {
      typeName: "Object",
      props
    };
    localTypes[varName] = `__literal_${varName}`;
  }

  // LSP signature helper matching open bracket triggers e.g. "myFunc("
  let signatureHelp: any = null;
  if (isBracketOpenTrigger) {
    // Look back to find active function word
    const matchFunc = currentLine.match(/([a-zA-Z0-9_$]+)\s*\($/);
    if (matchFunc) {
      const funcName = matchFunc[1];
      
      // Look for custom defined functions in text to offer high-fidelity sign help
      const dynamicDef = code.match(new RegExp(`(?:async\\s+)?function\\s+${funcName}\\s*\\(([^)]*)\\)`));
      if (dynamicDef) {
        signatureHelp = {
          signature: `${funcName}(${dynamicDef[1]}): any`,
          activeParameter: 0,
          doc: "Función local activa cargada en el hilo del Language Server."
        };
      } else {
        // Fallback or match standard JS libraries
        if (funcName === "fetch") {
          signatureHelp = {
            signature: "fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>",
            activeParameter: 0,
            doc: "Inicia una petición de red asíncrona hacia recursos web remotos."
          };
        } else if (funcName === "map") {
          signatureHelp = {
            signature: "map(callbackfn: (value: any, index: number, array: any[]) => any): any[]",
            activeParameter: 0
          };
        }
      }
    }
  }

  // Scenario A: Auto-evaluating property dot selection: "userObj."
  if (isDotTrigger) {
    // Find left-hand variable word
    const leftMatch = currentLine.match(/([a-zA-Z0-9_$]+)\.$/);
    if (leftMatch) {
      const varName = leftMatch[1];
      const typeOfVar = localTypes[varName];

      const matchedTypeObj = GLOBAL_TYPES[typeOfVar] || customTypeDefs[typeOfVar] || GLOBAL_TYPES[varName];
      if (matchedTypeObj) {
        const completionsResult = Object.entries(matchedTypeObj.props).map(([propName, info]) => ({
          label: propName,
          kind: info.kind,
          detail: info.detail,
          documentation: info.doc,
          insertText: info.insert || propName
        }));

        return {
          completions: completionsResult,
          triggerChar: ".",
          activeContextText: `${varName}.${typeOfVar ? ` (${typeOfVar})` : ""}`
        };
      }
    }
  }

  // Scenario B: Global, Import, keyword or snippet trigger
  const wordPrefixMatch = currentLine.match(/([a-zA-Z0-9_$]+)$/);
  const prefix = wordPrefixMatch ? wordPrefixMatch[1].toLowerCase() : "";

  // Compile general context candidates
  const list: CompletionItem[] = [];

  // Add Dynamic Local Variables found
  Object.entries(localTypes).forEach(([varName, varType]) => {
    if (!varType.startsWith("__literal_")) {
      list.push({
        label: varName,
        kind: "variable",
        detail: `const ${varName}: ${varType}`,
        insertText: varName
      });
    }
  });

  // Add custom classes definitions
  Object.keys(customTypeDefs).forEach(className => {
    if (!className.startsWith("__literal_")) {
      list.push({
        label: className,
        kind: "class",
        detail: `class ${className}`,
        insertText: className
      });
    }
  });

  // Add global structures
  Object.entries(GLOBAL_TYPES).forEach(([name, def]) => {
    list.push({
      label: name,
      kind: name === "console" || name === "localStorage" ? "variable" : "class",
      detail: `${def.typeName} global`,
      insertText: name
    });
  });

  // Load standard JS keywords depending on extension
  const standardJSKeywords = [
    "const", "let", "var", "function", "class", "extends", "import", "export", "from", "default",
    "return", "if", "else", "switch", "case", "for", "while", "break", "continue", "async", "await",
    "try", "catch", "finally", "typeof", "instanceof", "new", "this", "super", "null", "undefined", "true", "false"
  ];
  const standardPyKeywords = [
    "def", "class", "import", "from", "if", "elif", "else", "for", "while", "return", "try", "except", "lambda", "global", "pass", "yield"
  ];

  const currentKeywords = langKey === "py" ? standardPyKeywords : standardJSKeywords;
  currentKeywords.forEach(kw => {
    list.push({
      label: kw,
      kind: "keyword",
      detail: `palabra clave (${kw})`,
      insertText: kw
    });
  });

  // Add custom language snippets
  const snips = LANGUAGE_SNIPPETS[langKey] || [];
  list.push(...snips);

  // Filter based on currently typing prefix
  let filteredList = list;
  if (prefix) {
    filteredList = list.filter(item => item.label.toLowerCase().includes(prefix));
  }

  // If path is a bash or terminal command file
  if (ext === "sh" || ext === "bash" || fileName === "Dockerfile" || fileName === "Makefile") {
    filteredList = BASH_UTILS.filter(b => b.label.toLowerCase().includes(prefix)).map(b => ({
      label: b.label,
      kind: b.kind as any,
      detail: b.detail,
      documentation: b.doc,
      insertText: b.label
    }));
  }

  // Deduplicate entries safely
  const seen = new Set();
  const dedupedList = filteredList.filter(item => {
    const key = `${item.label}:${item.kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    completions: dedupedList.slice(0, 20), // return top 20 completions
    triggerChar,
    signatureHelp
  };
}

// Function to resolve snippets template insertion safely adjusting replacement index
export function applyLspCompletion(
  code: string,
  cursorIndex: number,
  item: CompletionItem
): {
  newText: string;
  newCursorIndex: number;
} {
  const codeBefore = code.substring(0, cursorIndex);
  const codeAfter = code.substring(cursorIndex);

  // Find prefix length to replace it cleanly
  const lines = codeBefore.split("\n");
  const currentLine = lines[lines.length - 1] || "";
  
  let matchLength = 0;
  if (item.kind !== "property" && item.kind !== "method") {
    const prefixMatch = currentLine.match(/([a-zA-Z0-9_$]+)$/);
    if (prefixMatch) {
      matchLength = prefixMatch[1].length;
    }
  }

  const baselineBefore = codeBefore.substring(0, codeBefore.length - matchLength);
  
  // Format tab stops if snippet (e.g. "map(item => $0)" -> "map(item => )")
  let insertVal = item.insertText;
  let finalCursorOffset = insertVal.length;

  if (item.kind === "snippet" || insertVal.includes("$0") || insertVal.includes("$1")) {
    // Strip simple placeholder patterns like ${1:condition} -> "condition"
    insertVal = insertVal.replace(/\$\{\d+:([^}]+)\}/g, "$1");
    // Strip tabstop cursors
    const zeroIndex = insertVal.indexOf("$0");
    const oneIndex = insertVal.indexOf("$1");
    insertVal = insertVal.replace(/\$[0123]/g, "");
    
    if (zeroIndex !== -1) {
      finalCursorOffset = zeroIndex;
    } else if (oneIndex !== -1) {
      finalCursorOffset = oneIndex;
    }
  }

  const newText = baselineBefore + insertVal + codeAfter;
  const newCursorIndex = baselineBefore.length + finalCursorOffset;

  return {
    newText,
    newCursorIndex
  };
}

export function getLspDiagnostics(
  code: string,
  fileName: string,
  filePath: string
): DiagnosticItem[] {
  const diagnostics: DiagnosticItem[] = [];
  if (!code) return diagnostics;

  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const lines = code.split("\n");

  // 1. Bracket Mismatches (For JavaScript, TypeScript, Python, C++, etc.)
  const bracketStack: { char: string; line: number; col: number; pos: number }[] = [];
  for (let i = 0; i < code.length; i++) {
    const textBefore = code.substring(0, i);
    const lineLines = textBefore.split("\n");
    const lineNo = lineLines.length;
    const colNo = lineLines[lineLines.length - 1].length + 1;

    const char = code[i];
    if (char === "(" || char === "[" || char === "{") {
      bracketStack.push({ char, line: lineNo, col: colNo, pos: i });
    } else if (char === ")" || char === "]" || char === "}") {
      const last = bracketStack.pop();
      if (!last) {
        diagnostics.push({
          id: `bracket-mismatch-${i}`,
          severity: "error",
          message: `Sintaxis: Se encontró un carácter de cierre huerfano '${char}' sin su correspodiente apertura.`,
          source: ext === "py" ? "Pylint" : ext === "rs" ? "rustc" : "TypeScript",
          line: lineNo,
          column: colNo,
          length: 1,
          filePath
        });
      } else {
        const isMismatch =
          (char === ")" && last.char !== "(") ||
          (char === "]" && last.char !== "[") ||
          (char === "}" && last.char !== "{");
        if (isMismatch) {
          diagnostics.push({
            id: `bracket-mismatch-${i}`,
            severity: "error",
            message: `Sintaxis: Mismatch de corchete. Se abrió '${last.char}' en línea ${last.line} pero se cerró con '${char}'.`,
            source: ext === "py" ? "Pylint" : ext === "rs" ? "rustc" : "TypeScript",
            line: lineNo,
            column: colNo,
            length: 1,
            filePath
          });
        }
      }
    }
  }
  for (const item of bracketStack) {
    diagnostics.push({
      id: `bracket-unclosed-${item.pos}`,
      severity: "error",
      message: `Sintaxis: El carácter '${item.char}' se abrió aquí pero nunca se cerró.`,
      source: ext === "py" ? "Pylint" : ext === "rs" ? "rustc" : "TypeScript",
      line: item.line,
      column: item.col,
      length: 1,
      filePath
    });
  }

  const jsTsExts = ["js", "jsx", "ts", "tsx"];

  // 2. Python rules
  if (ext === "py") {
    let hasSpaceIndents = false;
    let hasTabIndents = false;

    lines.forEach((lineText, idx) => {
      const lineNo = idx + 1;
      const leadingWhitespace = lineText.match(/^([ \t]+)/);
      if (leadingWhitespace) {
        const ws = leadingWhitespace[1];
        if (ws.includes(" ")) hasSpaceIndents = true;
        if (ws.includes("\t")) hasTabIndents = true;
      }

      const matchDef = lineText.match(/^\s*(def|class)\s+([a-zA-Z0-9_$]+)/);
      if (matchDef) {
        let docstringFound = false;
        let nextIdx = idx + 1;
        while (nextIdx < lines.length && lines[nextIdx].trim() === "") {
          nextIdx++;
        }
        if (nextIdx < lines.length) {
          const nextLineTrimmed = lines[nextIdx].trim();
          if (nextLineTrimmed.startsWith('"""') || nextLineTrimmed.startsWith("'''")) {
            docstringFound = true;
          }
        }
        if (!docstringFound) {
          diagnostics.push({
            id: `py-docstring-${idx}`,
            severity: "warning",
            message: `Pylint C0116: Missing ${matchDef[1] === "def" ? "function" : "class"} docstring inside definition of '${matchDef[2]}'.`,
            source: "Pylint",
            line: lineNo,
            column: lineText.indexOf(matchDef[1]) + 1,
            length: matchDef[1].length + 1 + matchDef[2].length,
            filePath
          });
        }
      }
    });

    if (hasSpaceIndents && hasTabIndents) {
      diagnostics.push({
        id: "py-indentation-mixed",
        severity: "error",
        message: "Pylint W0312: Found mixed indentation. Indentation contains both tabs and spaces.",
        source: "Pylint",
        line: 1,
        column: 1,
        length: Math.max(10, lines[0]?.length || 10),
        filePath
      });
    }
  }

  // 3. Unused variables & parameters
  if (jsTsExts.includes(ext) || ext === "rs" || ext === "py") {
    lines.forEach((lineText, idx) => {
      const lineNo = idx + 1;
      let matches: RegExpMatchArray | null = null;
      let varName = "";
      let offsetCol = 1;

      if (jsTsExts.includes(ext)) {
        const regexJs = /\b(const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
        let m;
        while ((m = regexJs.exec(lineText)) !== null) {
          varName = m[2];
          offsetCol = m.index + m[0].indexOf(varName) + 1;
          checkAndAddUnused(varName, lineNo, offsetCol, "ESLint");
        }

        const regexFn = /\bfunction\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/;
        matches = lineText.match(regexFn);
        if (matches) {
          varName = matches[1];
          offsetCol = lineText.indexOf(varName) + 1;
          checkAndAddUnused(varName, lineNo, offsetCol, "ESLint");
        }
      } else if (ext === "rs") {
        const regexRs = /\blet\s+(?:mut\s+)?([a-zA-Z_][a-zA-Z0-9_]*)/;
        matches = lineText.match(regexRs);
        if (matches) {
          varName = matches[1];
          offsetCol = lineText.indexOf(varName) + 1;
          if (varName && !varName.startsWith("_") && varName !== "let" && varName !== "mut") {
            checkAndAddUnused(varName, lineNo, offsetCol, "rustc");
          }
        }
      } else if (ext === "py") {
        const regexPy = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=/;
        matches = lineText.match(regexPy);
        if (matches) {
          varName = matches[1];
          offsetCol = lineText.indexOf(varName) + 1;
          checkAndAddUnused(varName, lineNo, offsetCol, "Pylint");
        }
      }
    });

    function checkAndAddUnused(nameValue: string, lineNo: number, colNo: number, sourceName: "ESLint" | "rustc" | "Pylint") {
      if (!nameValue || ["import", "export", "return", "from", "let", "const", "class"].includes(nameValue)) return;
      const r = new RegExp(`\\b${nameValue}\\b`, "g");
      const occurrences = code.match(r);
      if (occurrences && occurrences.length === 1) {
        diagnostics.push({
          id: `unused-${nameValue}-${lineNo}`,
          severity: "warning",
          message: sourceName === "ESLint"
            ? `ESLint (no-unused-vars): '${nameValue}' is declared but never read.`
            : sourceName === "rustc"
              ? `rustc warning: unused variable: '${nameValue}' (prefix with underscore like '_${nameValue}' to ignore).`
              : `Pylint W0612: Unused variable '${nameValue}'.`,
          source: sourceName,
          line: lineNo,
          column: colNo,
          length: nameValue.length,
          filePath
        });
      }
    }
  }

  // 4. Unexpected console.log and empty blocks (JS/TS)
  if (jsTsExts.includes(ext)) {
    lines.forEach((lineText, idx) => {
      const lineNo = idx + 1;
      const cIndex = lineText.indexOf("console.log");
      if (cIndex !== -1) {
        diagnostics.push({
          id: `no-console-${idx}`,
          severity: "info",
          message: "ESLint (no-console): Unexpected console.log statement inside active development scope.",
          source: "ESLint",
          line: lineNo,
          column: cIndex + 1,
          length: 11,
          filePath
        });
      }

      const emptyMatches = lineText.matchAll(/\{\s*\}/g);
      for (const m of emptyMatches) {
        const colNo = (m.index ?? 0) + 1;
        diagnostics.push({
          id: `no-empty-${idx}-${colNo}`,
          severity: "warning",
          message: "ESLint (no-empty): Empty block statement. Avoid empty blocks of code or document with comments.",
          source: "ESLint",
          line: lineNo,
          column: colNo,
          length: m[0].length,
          filePath
        });
      }
    });
  }

  // 5. Stylistic rules: missing semicolons inside JS/TS
  if (jsTsExts.includes(ext)) {
    lines.forEach((lineText, idx) => {
      const lineNo = idx + 1;
      const trimmed = lineText.trim();
      if (!trimmed) return;

      if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) return;
      if (trimmed.endsWith("{") || trimmed.endsWith("}") || trimmed.endsWith(",") || trimmed.endsWith(";")) return;
      if (trimmed.startsWith("if") || trimmed.startsWith("for") || trimmed.startsWith("while") || trimmed.startsWith("try") || trimmed.startsWith("catch") || trimmed.startsWith("class") || trimmed.startsWith("import") || trimmed.startsWith("export")) return;

      if (trimmed.length > 5 && !trimmed.endsWith(";")) {
        diagnostics.push({
          id: `prettier-semi-${idx}`,
          severity: "warning",
          message: "Prettier: Missing semicolon inside JavaScript statement block.",
          source: "Prettier",
          line: lineNo,
          column: lineText.length || 1,
          length: 1,
          filePath
        });
      }
    });
  }

  // 6. Rust snake_case naming enforcement
  if (ext === "rs") {
    lines.forEach((lineText, idx) => {
      const lineNo = idx + 1;
      const regexDecl = /\blet\s+(?:mut\s+)?([a-zA-Z0-9_]+)/;
      const m = lineText.match(regexDecl);
      if (m) {
        const varName = m[1];
        if (/[A-Z]/.test(varName) && !/^[A-Z0-9_]+$/.test(varName) && varName !== "let") {
          diagnostics.push({
            id: `rs-camel-${idx}`,
            severity: "warning",
            message: `rustc warning: variable '${varName}' should have a snake_case name, e.g. let dynamic_result = 45;`,
            source: "rustc",
            line: lineNo,
            column: lineText.indexOf(varName) + 1,
            length: varName.length,
            filePath
          });
        }
      }
    });
  }

  return diagnostics;
}
