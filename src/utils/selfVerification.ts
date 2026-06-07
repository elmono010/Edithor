import { FileNode } from "../types";
import { flattenFileTree } from "./initialWorkspaces";

export interface ImportValidationResult {
  isValid: boolean;
  logs: string[];
  brokenImports: {
    importPath: string;
    resolvedPath: string;
    filePath: string;
  }[];
}

/**
 * Resuelve una ruta relativa desde una base dada.
 * Ejemplo:
 *   - base: 'src/components/AgentChat.tsx' -> directorio base 'src/components'
 *   - relativePath: '../types' -> 'src/types'
 *   - relativePath: './TaskWalkthrough' -> 'src/components/TaskWalkthrough'
 */
export function resolveRelativePath(baseFilePath: string, relativePath: string): string {
  const parts = baseFilePath.split("/");
  parts.pop(); // quitar archivo para tener directorio base

  const relParts = relativePath.split("/");
  for (const p of relParts) {
    if (p === "." || p === "") {
      continue;
    } else if (p === "..") {
      parts.pop();
    } else {
      parts.push(p);
    }
  }

  return parts.join("/");
}

/**
 * Verifica todas las rutas relativas importadas en un archivo dado contra el FileTree del workspace.
 */
export function verifyImportsInFile(
  fileTree: FileNode[],
  filePath: string,
  content: string
): ImportValidationResult {
  const logs: string[] = [];
  const brokenImports: { importPath: string; resolvedPath: string; filePath: string; }[] = [];
  
  logs.push(`🔍 Analizando importaciones de: ${filePath.split("/").pop()} (${filePath})`);

  // Regex para encontrar imports, require e imports dinámicos
  // Ej: import { X } from "./Y"; o import "./Z.css"; o import type { A } from "../B";
  const importRegex = /(?:import\s+[\s\S]*?\s+from\s+|import\s+|require\s*\(\s*|import\s*\(\s*)["'](\.\.?\/[^"']+)["']/g;
  
  const matches: string[] = [];
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    if (match[1] && !matches.includes(match[1])) {
      matches.push(match[1]);
    }
  }

  if (matches.length === 0) {
    logs.push(`✓ No se encontraron importaciones relativas en ${filePath.split("/").pop()}.`);
    return { isValid: true, logs, brokenImports };
  }

  const flattenedTree = flattenFileTree(fileTree);
  const filePathsInTree = new Set(flattenedTree.map(f => f.path));

  let hasErrors = false;

  for (const importPath of matches) {
    const resolvedRaw = resolveRelativePath(filePath, importPath);
    
    // Posibles extensiones a evaluar
    const possibleExtensions = [".tsx", ".ts", ".jsx", ".js", ".css", ""];
    let found = false;

    for (const ext of possibleExtensions) {
      const fullCheckedPath = resolvedRaw.endsWith(ext) ? resolvedRaw : `${resolvedRaw}${ext}`;
      if (filePathsInTree.has(fullCheckedPath)) {
        found = true;
        break;
      }
      
      // Probar directorio default /index.ts o /index.tsx si es carpeta
      const indexTsPath = `${resolvedRaw}/index.ts`;
      const indexTsxPath = `${resolvedRaw}/index.tsx`;
      if (filePathsInTree.has(indexTsPath) || filePathsInTree.has(indexTsxPath)) {
        found = true;
        break;
      }
    }

    if (found) {
      logs.push(`✓ Import resuelto: "${importPath}" ➔ "${resolvedRaw}" [OK]`);
    } else {
      hasErrors = true;
      logs.push(`✗ ERROR: Import roto detectado: "${importPath}" resuelto a "${resolvedRaw}" no coincide con ningún archivo.`);
      brokenImports.push({
        importPath,
        resolvedPath: resolvedRaw,
        filePath
      });
    }
  }

  if (!hasErrors) {
    logs.push(`✓ Todas las importaciones de ${filePath.split("/").pop()} son válidas.`);
  }

  return {
    isValid: !hasErrors,
    logs,
    brokenImports
  };
}
