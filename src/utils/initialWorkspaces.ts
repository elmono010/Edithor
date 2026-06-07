import { Workspace, FileNode } from "../types";

export const initialWorkspaces: Workspace[] = [
  {
    id: "ws-portfolio",
    name: "Web Portfolio Studio",
    description: "Responsive personal portfolio website with custom layouts and smooth animation scripts.",
    activeFilePath: "src/main.js",
    chatHistory: [
      {
        id: "m1",
        role: "user",
        content: "Bienvenido al editor. ¿De qué se trata este proyecto?",
        timestamp: "2026-06-07T05:00:00Z"
      },
      {
        id: "m2",
        role: "assistant",
        content: "¡Hola! Este es un proyecto de portafolio web interactivo. Contiene una estructura moderna con `index.html`, un archivo de estilos `style.css` y un controlador lógico `src/main.js`. Puedes chatear conmigo para pedirme que agregue secciones, mejore los estilos o programe nuevas funcionalidades interactivas en vivo.",
        timestamp: "2026-06-07T05:00:15Z"
      }
    ],
    terminalHistory: [
      "Microsoft Windows Simulated Shell v1.0",
      "Type 'help' for available commands.",
      "Workspace loaded: Web Portfolio Studio",
      "Ready."
    ],
    fileTree: [
      {
        name: "index.html",
        path: "index.html",
        type: "file",
        content: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Mi Portafolio Creativo</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header>
    <h1>Hola, soy un Desarrollador Full-Stack</h1>
    <p>Construyendo aplicaciones excepcionales del futuro.</p>
  </header>
  
  <section class="projects">
    <h2>Mis Proyectos</h2>
    <div id="project-container">
      <!-- Los proyectos se cargan dinámicamente desde src/main.js -->
    </div>
  </section>

  <section class="contact">
    <h2>Contáctame</h2>
    <button id="btn-contact">Enviar Mensaje</button>
  </section>

  <script src="src/main.js"></script>
</body>
</html>`
      },
      {
        name: "style.css",
        path: "style.css",
        type: "file",
        content: `body {
  font-family: 'Inter', system-ui, sans-serif;
  background-color: #0f172a;
  color: #f8fafc;
  margin: 0;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

header {
  border-bottom: 1px solid #334155;
  padding-bottom: 2rem;
}

h1 {
  color: #38bdf8;
  font-size: 2.5rem;
  margin: 0;
}

h2 {
  color: #f1f5f9;
}

.project-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  transition: transform 0.2s;
}

.project-card:hover {
  transform: translateY(-4px);
  border-color: #38bdf8;
}

button {
  background-color: #38bdf8;
  color: #0f172a;
  border: none;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover {
  background-color: #0ea5e9;
}`
      },
      {
        name: "src",
        path: "src",
        type: "directory",
        children: [
          {
            name: "main.js",
            path: "src/main.js",
            type: "file",
            content: `// Datos de proyectos virtuales
const projects = [
  { name: "SaaS Dashboard AI", desc: "Monitor de APIs conectadas en tiempo real." },
  { name: "CryptoTracker", desc: "Gráficos interactivos de criptoactivos." }
];

function loadProjects() {
  const container = document.getElementById('project-container');
  if (!container) return;

  container.innerHTML = projects.map(proj => \`
    <div class="project-card">
      <h3>\${proj.name}</h3>
      <p>\${proj.desc}</p>
    </div>
  \`).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  loadProjects();

  const contactButton = document.getElementById('btn-contact');
  if (contactButton) {
    contactButton.addEventListener('click', () => {
      alert('¡Gracias por hacer clic! Conexión simulada con éxito.');
    });
  }
});`
          }
        ]
      }
    ]
  },
  {
    id: "ws-ai",
    name: "Gemini Agent Bot",
    description: "Multi-modal Python agent integrating live Gemini API streaming structures.",
    activeFilePath: "main.py",
    chatHistory: [],
    terminalHistory: [
      "Simulated Shell Environment v1.0",
      "Type 'help' to review simulated operations.",
      "Workspace loaded: Gemini Agent Bot",
      "Ready."
    ],
    fileTree: [
      {
        name: "main.py",
        path: "main.py",
        type: "file",
        content: `import os
from google import genai
from google.genai import types

def generate_ai_explanation():
    """
    Simulated Python call using the official @google/genai SDK.
    Remember to keep your API keys securely in the .env configuration.
    """
    api_key = os.environ.get("GEMINI_API_KEY", "MOCK_KEY_XYZ")
    print(f"Initializing connection to Gemini with key: {api_key[:5]}...")
    
    # Correct named-parameter client instantiation
    client = genai.Client(api_key=api_key)
    
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents='Explain quantum computing to a high schooler in 2 sentences.',
    )
    
    print("\\nResponse text:")
    print(response.text)

if __name__ == "__main__":
    generate_ai_explanation()`
      },
      {
        name: "config.json",
        path: "config.json",
        type: "file",
        content: `{
  "agent_name": "Antigravity Assistant",
  "temperature": 0.3,
  "max_tokens": 1000,
  "enabled_tools": [
    "googleSearch",
    "googleMaps"
  ]
}`
      },
      {
        name: "requirements.txt",
        path: "requirements.txt",
        type: "file",
        content: `google-genai>=2.4.0
dotenv>=17.2.3
requests>=2.31.0`
      }
    ]
  }
];

// RECURSIVE FILE TREE UTILITIES //

export function findFileByPath(tree: FileNode[], pathStr: string): FileNode | null {
  for (const node of tree) {
    if (node.path === pathStr) {
      return node;
    }
    if (node.type === "directory" && node.children) {
      const found = findFileByPath(node.children, pathStr);
      if (found) return found;
    }
  }
  return null;
}

export function updateFileContent(tree: FileNode[], pathStr: string, newContent: string): FileNode[] {
  return tree.map(node => {
    if (node.path === pathStr) {
      return { ...node, content: newContent };
    }
    if (node.type === "directory" && node.children) {
      return {
        ...node,
        children: updateFileContent(node.children, pathStr, newContent)
      };
    }
    return node;
  });
}

export function addNewNodeToTree(tree: FileNode[], parentPath: string | null, newNode: FileNode): FileNode[] {
  if (!parentPath) {
    return [...tree, newNode];
  }
  return tree.map(node => {
    if (node.path === parentPath && node.type === "directory") {
      return {
        ...node,
        children: [...(node.children || []), newNode]
      };
    }
    if (node.type === "directory" && node.children) {
      return {
        ...node,
        children: addNewNodeToTree(node.children, parentPath, newNode)
      };
    }
    return node;
  });
}

export function deleteNodeFromTree(tree: FileNode[], pathStr: string): FileNode[] {
  return tree
    .filter(node => node.path !== pathStr)
    .map(node => {
      if (node.type === "directory" && node.children) {
        return {
          ...node,
          children: deleteNodeFromTree(node.children, pathStr)
        };
      }
      return node;
    });
}

export function flattenFileTree(tree: FileNode[]): FileNode[] {
  const result: FileNode[] = [];
  function recurse(nodes: FileNode[]) {
    for (const node of nodes) {
      if (node.type === "file") {
        result.push(node);
      }
      if (node.type === "directory" && node.children) {
        recurse(node.children);
      }
    }
  }
  recurse(tree);
  return result;
}

export function moveNodeInTree(tree: FileNode[], sourcePath: string, targetParentPath: string | null): FileNode[] {
  const nodeToMove = findFileByPath(tree, sourcePath);
  if (!nodeToMove) return tree;

  const treeRemoved = deleteNodeFromTree(tree, sourcePath);

  function correctPaths(node: FileNode, newParentPath: string | null): FileNode {
    const newPath = newParentPath ? `${newParentPath}/${node.name}` : node.name;
    if (node.type === "directory" && node.children) {
      return {
        ...node,
        path: newPath,
        children: node.children.map(child => correctPaths(child, newPath))
      };
    }
    return { ...node, path: newPath };
  }

  const correctedNode = correctPaths(nodeToMove, targetParentPath);
  return addNewNodeToTree(treeRemoved, targetParentPath, correctedNode);
}

export function createRecursiveFoldersInTree(tree: FileNode[], fullFilePath: string): { tree: FileNode[], parentPath: string | null } {
  const parts = fullFilePath.split("/");
  if (parts.length <= 1) {
    return { tree, parentPath: null };
  }
  
  const foldersToCreate = parts.slice(0, parts.length - 1);
  let currentTree = tree;
  let currentAccumPath = "";
  
  for (let i = 0; i < foldersToCreate.length; i++) {
    const parent = currentAccumPath || null;
    const folderName = foldersToCreate[i];
    const folderPath = currentAccumPath ? `${currentAccumPath}/${folderName}` : folderName;
    
    // Check if folder exists
    const exists = findFileByPath(currentTree, folderPath);
    if (!exists) {
      const newFolderNode: FileNode = {
        name: folderName,
        path: folderPath,
        type: "directory",
        children: []
      };
      currentTree = addNewNodeToTree(currentTree, parent, newFolderNode);
    }
    currentAccumPath = folderPath;
  }
  
  return { tree: currentTree, parentPath: currentAccumPath };
}


