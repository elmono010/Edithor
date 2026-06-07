export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  content?: string;
  children?: FileNode[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  proposedEdits?: ProposedEdit[];
}

export interface ProposedEdit {
  filePath: string;
  originalContent: string;
  newContent: string;
  status: "pending" | "applied" | "rejected";
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  fileTree: FileNode[];
  activeFilePath: string | null;
  chatHistory: ChatMessage[];
  terminalHistory: string[];
  gitStagedPaths?: string[];
  gitLineStagedChanges?: Record<string, string[]>; // filePath -> array of line contents/ranges
  gitBaseTree?: FileNode[];
  gitCommits?: GitCommit[];
}

export interface GitCommit {
  id: string;
  hash: string;
  message: string;
  author: string;
  date: string;
  snapshot: FileNode[];
}

export interface LLMConfig {
  provider: "gemini" | "openai" | "anthropic" | "deepseek";
  model: string;
  geminiKey: string;
  openaiKey: string;
  anthropicKey: string;
  deepseekKey: string;
}

export interface DiagnosticItem {
  id: string;
  severity: "error" | "warning" | "info";
  message: string;
  source: "ESLint" | "Pylint" | "rustc" | "TypeScript" | "Prettier" | "IA Bug Detector" | string;
  line: number;
  column: number;
  length: number;
  codeSnippet?: string;
  filePath: string;
}

export interface TaskItem {
  id: string;
  text: string;
  status: "pending" | "running" | "completed";
}

export interface SkillItem {
  id: string;
  name: string;
  description: string;
  promptContent: string;
  category: string;
  isActive: boolean;
  isSystem?: boolean;
}


