export interface AgenticLoopState {
  intent: string | null;
  scope: string | null;
  complexity: string | null;
  plan: string[];
  tasks: { id: string; label: string; status: "pending" | "running" | "done" }[];
  currentExecutingTaskId: string | null;
  completedTaskIds: string[];
  isVerifying: boolean;
  verificationReport: string | null;
}

export function parseAgentLoop(text: string): AgenticLoopState {
  const state: AgenticLoopState = {
    intent: null,
    scope: null,
    complexity: null,
    plan: [],
    tasks: [],
    currentExecutingTaskId: null,
    completedTaskIds: [],
    isVerifying: false,
    verificationReport: null,
  };

  if (!text) return state;

  // 1. Parse INTENT
  const intentMatch = text.match(/INTENT:\s*([^\n]+)/i);
  if (intentMatch) {
    state.intent = intentMatch[1].trim();
  }

  // 2. Parse SCOPE
  const scopeMatch = text.match(/SCOPE:\s*([^\n]+)/i);
  if (scopeMatch) {
    state.scope = scopeMatch[1].trim();
  }

  // 3. Parse COMPLEXITY
  const complexityMatch = text.match(/COMPLEXITY:\s*([^\n]+)/i);
  if (complexityMatch) {
    state.complexity = complexityMatch[1].trim();
  }

  // 4. Parse PLAN block
  const planBlockRegex = /::PLAN::([\s\S]*?)(?:::END_PLAN::|$)/;
  const planMatch = text.match(planBlockRegex);
  if (planMatch && planMatch[1]) {
    const lines = planMatch[1].split("\n");
    state.plan = lines
      .map(line => line.replace(/^[-*•]\s*/, "").trim())
      .filter(line => line.length > 0);
  }

  // 5. Parse TASKS block
  const tasksBlockRegex = /::TASKS::([\s\S]*?)(?:::END_TASKS::|$)/;
  const tasksMatch = text.match(tasksBlockRegex);
  if (tasksMatch && tasksMatch[1]) {
    const rawTasks = tasksMatch[1].split("\n");
    const taskList: { id: string; label: string; status: "pending" | "running" | "done" }[] = [];
    
    for (const raw of rawTasks) {
      const match = raw.match(/^\[?(\d+)\]?\s*([^\n]+)/);
      if (match) {
        taskList.push({
          id: match[1],
          label: match[2].trim(),
          status: "pending"
        });
      }
    }
    state.tasks = taskList;
  }

  // 6. Parse EXECUTING_TASK & TASK_DONE
  const execRegex = /::EXECUTING_TASK::(\d+)::/g;
  let execMatch;
  while ((execMatch = execRegex.exec(text)) !== null) {
    state.currentExecutingTaskId = execMatch[1];
  }

  const doneRegex = /::TASK_DONE::(\d+)::/g;
  let doneMatch;
  while ((doneMatch = doneRegex.exec(text)) !== null) {
    const id = doneMatch[1];
    if (!state.completedTaskIds.includes(id)) {
      state.completedTaskIds.push(id);
    }
  }

  // Auto-mark status based on tags
  state.tasks = state.tasks.map(task => {
    if (state.completedTaskIds.includes(task.id)) {
      return { ...task, status: "done" as const };
    }
    if (state.currentExecutingTaskId === task.id) {
      return { ...task, status: "running" as const };
    }
    if (state.currentExecutingTaskId && parseInt(task.id) < parseInt(state.currentExecutingTaskId)) {
      return { ...task, status: "done" as const };
    }
    return task;
  });

  // 7. Parse SELF_VERIFICATION
  if (text.includes("::SELF_VERIFICATION::")) {
    state.isVerifying = true;
    const verifyRegex = /::SELF_VERIFICATION::([\s\S]*?)(?:::END_SELF_VERIFICATION::|$)/;
    const verifyMatch = text.match(verifyRegex);
    if (verifyMatch && verifyMatch[1]) {
      state.verificationReport = verifyMatch[1].trim();
    }
  }

  return state;
}

export function cleanAgenticLoopResponse(text: string): string {
  if (!text) return "";
  let clean = text;

  // Strips INTENT, SCOPE, COMPLEXITY lines
  clean = clean.replace(/INTENT:\s*[^\n]*\n?/gi, "");
  clean = clean.replace(/SCOPE:\s*[^\n]*\n?/gi, "");
  clean = clean.replace(/COMPLEXITY:\s*[^\n]*\n?/gi, "");

  // Strips blocks
  clean = clean.replace(/::PLAN::[\s\S]*?::END_PLAN::\n?/gi, "");
  clean = clean.replace(/::PLAN::[\s\S]*$/gi, ""); // If streaming/unclosed

  clean = clean.replace(/::TASKS::[\s\S]*?::END_TASKS::\n?/gi, "");
  clean = clean.replace(/::TASKS::[\s\S]*$/gi, ""); // If streaming/unclosed

  clean = clean.replace(/::EXECUTING_TASK::\d+::\n?/gi, "");
  clean = clean.replace(/::TASK_DONE::\d+::\n?/gi, "");

  clean = clean.replace(/::SELF_VERIFICATION::[\s\S]*?::END_SELF_VERIFICATION::\n?/gi, "");
  clean = clean.replace(/::SELF_VERIFICATION::[\s\S]*$/gi, ""); // If streaming/unclosed

  // Also strip existing format ::UPDATED_FILE::
  clean = clean.replace(/::UPDATED_FILE::[\s\S]+?::END_UPDATED_FILE::\n?/g, "");
  clean = clean.replace(/::UPDATED_FILE::[\s\S]*$/g, "");

  // Strip code blocks markdown that go directly to editor (```...```)
  clean = clean.replace(/```[\w-]*[\r\n]?[\s\S]*?```\n?/g, "");
  clean = clean.replace(/```[\w-]*[\r\n]?[\s\S]*$/g, "");

  return clean.trim();
}
