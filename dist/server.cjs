var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_genai = require("@google/genai");
var import_vite = require("vite");
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "10mb" }));
app.post("/api/ai/process", async (req, res) => {
  try {
    const {
      provider,
      model,
      messages,
      activeFile,
      fileTree,
      instruction,
      mode,
      // "chat" or "edit"
      openTabs = [],
      recentEdits = [],
      activeSkills = []
    } = req.body;
    const userGeminiKey = req.headers["x-gemini-key"];
    const userOpenaiKey = req.headers["x-openai-key"];
    const userAnthropicKey = req.headers["x-anthropic-key"];
    const userDeepseekKey = req.headers["x-deepseek-key"];
    const extractImports = (content) => {
      if (!content) return [];
      const lines = content.split("\n");
      const importLines = lines.filter(
        (line) => line.trim().startsWith("import ") || line.trim().startsWith("const ") && line.includes("require(")
      );
      return importLines.map((line) => line.trim());
    };
    const detectedImports = activeFile ? extractImports(activeFile.content) : [];
    let activeSkillsPromptPart = "";
    if (activeSkills && activeSkills.length > 0) {
      activeSkillsPromptPart = `
=== USER ACTIVE SKILL DIRECTIVES ===
You MUST strictly adhere to the following customized coding rules during execution:
`;
      activeSkills.forEach((s) => {
        activeSkillsPromptPart += `- [Rule Name: ${s.name}]: ${s.promptContent}
`;
      });
      activeSkillsPromptPart += `====================================

`;
    }
    const systemPrompt = `You are an elite AI coding agent executing a structured "Agentic Loop" integrated inside "AI Studio IDE".
You have full access to the user's project workspace context.
${activeSkillsPromptPart}
=== CONTEXT ENGINE ===
- Active Open File: ${activeFile ? `\`${activeFile.path}\`` : "None"}
- Workspace Open Tabs: ${JSON.stringify(openTabs)}
- Recent Workspace Edits: ${JSON.stringify(recentEdits)}
- Detected Active Dependencies: ${JSON.stringify(detectedImports)}
- Workspace File Tree:
${JSON.stringify(fileTree, null, 2)}

=== ACTIVE FILE CONTENTS ===
${activeFile ? `\`\`\`
${activeFile.content}
\`\`\`` : "(No file open)"}

======================
CRITICAL: AGENTIC LOOP PROTOCOL
======================
Before outputting any conversational response, you MUST adhere to the following sequence of phases. Always produce the exact block headers.

Fase 1: Intent Parsing
Output first the classification of the request exactly like this at the very beginning of your response:
INTENT: <refactor | bugfix | new_feature | explain | test>
SCOPE: <current_file | multiple_files | new_file>
COMPLEXITY: <simple | medium | complex>

Fase 2: Context Evaluation
(Evaluate context silently based on the CONTEXT ENGINE details provided above)

Fase 3: Planning
Output an explicit planning block wrapped in ::PLAN:: and ::END_PLAN:: to list the actions you will execute:
::PLAN::
- Modificar: [file path] ([brief reason why])
- Crear: [file path] ([brief reason why])
- No tocar: [file path]
::END_PLAN::

Fase 4: Task Decomposition
Produce the subtasks sequence wrapped in ::TASKS:: and ::END_TASKS:: before writing any code:
::TASKS::
[1] [First logical step / analyzer task]
[2] [Implementation detail task]
[3] [Syntactic cleanup or verify task]
::END_TASKS::

Fase 5: Execution Stream
As execution moves forward, wrap each file modification inside ::EXECUTING_TASK::<id>:: and finish it with ::TASK_DONE::<id>:: surrounding your ::UPDATED_FILE:: block:
::EXECUTING_TASK::<id>::
::UPDATED_FILE::path/to/file.ext
[FULL COMPLETED CODE OF THE FILE HERE]
::END_UPDATED_FILE::
::TASK_DONE::<id>::

Fase 6: Self-Verification
At the very end of your execution, perform a self-assessment of the proposed code and print a self-verification report wrapped in:
::SELF_VERIFICATION::
[Analysis of imports, type safety, syntax alignment, and self-validation details]
VERIFIED
::END_SELF_VERIFICATION::

*IMPORTANT RULES*:
- Never output empty, sliced, or placeholder files. If you use ::UPDATED_FILE::, ALWAYS output the COMPLETE file contents.
- Keep the actual conversational markdown brief and friendly, describing the changes made. Custom markers will be stripped by the IDE and rendered in the agent panel.`;
    let activeProvider = provider || "gemini";
    let activeModel = model;
    let fallbackWarning = "";
    if (activeProvider === "deepseek" && !userDeepseekKey) {
      if (userGeminiKey || process.env.GEMINI_API_KEY) {
        activeProvider = "gemini";
        activeModel = "gemini-3.5-flash";
        fallbackWarning = "\u26A0\uFE0F *Nota: Se ha cambiado autom\xE1ticamente al modelo de respaldo Gemini 3.5 Flash debido a que la API Key de DeepSeek en 'Ajustes' no est\xE1 configurada.*\n\n";
      }
    } else if (activeProvider === "openai" && !userOpenaiKey) {
      if (userGeminiKey || process.env.GEMINI_API_KEY) {
        activeProvider = "gemini";
        activeModel = "gemini-3.5-flash";
        fallbackWarning = "\u26A0\uFE0F *Nota: Se ha cambiado autom\xE1ticamente al modelo de respaldo Gemini 3.5 Flash debido a que la API Key de OpenAI en 'Ajustes' no est\xE1 configurada.*\n\n";
      }
    } else if (activeProvider === "anthropic" && !userAnthropicKey) {
      if (userGeminiKey || process.env.GEMINI_API_KEY) {
        activeProvider = "gemini";
        activeModel = "gemini-3.5-flash";
        fallbackWarning = "\u26A0\uFE0F *Nota: Se ha cambiado autom\xE1ticamente al modelo de respaldo Gemini 3.5 Flash debido a que la API Key de Anthropic en 'Ajustes' no est\xE1 configurada.*\n\n";
      }
    }
    if (activeProvider === "gemini") {
      const apiKey = userGeminiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(400).json({ error: "Gemini API key is missing. Please configuration your key in Settings." });
        return;
      }
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const selectedModel = activeModel || "gemini-3.5-flash";
      const formattedContents = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));
      try {
        const responseStream = await ai.models.generateContentStream({
          model: selectedModel,
          contents: formattedContents,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.2
          }
        });
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        if (fallbackWarning) {
          res.write(`data: ${JSON.stringify({ text: fallbackWarning })}

`);
        }
        for await (const chunk of responseStream) {
          if (chunk.text) {
            res.write(`data: ${JSON.stringify({ text: chunk.text })}

`);
          }
        }
        res.end();
      } catch (err) {
        console.error("Gemini stream execution error:", err);
        const errMsg = err.message || "";
        const isQuota = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota") || errMsg.includes("Quota") || err.status && err.status === 429;
        let customMsg = "";
        if (isQuota) {
          customMsg = `\u{1F6A8} **Excedido el l\xEDmite de cuota (Quota Limits / 429 / RESOURCE_EXHAUSTED)**

El servidor o la clave compartida de Gemini han alcanzado su l\xEDmite de peticiones gratuitas. 

### \u{1F527} **C\xF3mo solucionarlo y continuar sin l\xEDmites:**
1. Haz clic en el bot\xF3n de **Ajustes** \u2699\uFE0F (icono de engranaje en la esquina inferior izquierda de la interfaz).
2. Pega tu propia **Gemini API Key**. Puedes obtener una gratis y al instante en la consola de **[Google AI Studio](https://aistudio.google.com/)**.
3. \xA1Guarda tu clave de API y contin\xFAa programando con peticiones r\xE1pidas, estables e ilimitadas!`;
        } else {
          customMsg = `\u26A0\uFE0F **Error al procesar la solicitud con Gemini:**

${errMsg}

Por favor, verifica tus claves en los **Ajustes** para continuar.`;
        }
        if (!res.headersSent) {
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");
        }
        res.write(`data: ${JSON.stringify({ text: customMsg })}

`);
        res.end();
      }
      return;
    }
    if (activeProvider === "openai") {
      const apiKey = userOpenaiKey;
      if (!apiKey) {
        res.status(400).json({ error: "OpenAI API Key is required for this model." });
        return;
      }
      const selectedModel = activeModel || "gpt-4o-mini";
      const openAIMessages = [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role,
          content: m.content
        }))
      ];
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: openAIMessages,
          temperature: 0.2,
          stream: true
        })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        res.status(response.status).json({ error: errData.error?.message || "OpenAI API request failed." });
        return;
      }
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      if (fallbackWarning) {
        res.write(`data: ${JSON.stringify({ text: fallbackWarning })}

`);
      }
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      for await (const chunk of response.body) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const cleaned = line.trim();
          if (cleaned.startsWith("data: ")) {
            const dataStr = cleaned.slice(6);
            if (dataStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(dataStr);
              const chunkText = parsed.choices?.[0]?.delta?.content || "";
              if (chunkText) {
                res.write(`data: ${JSON.stringify({ text: chunkText })}

`);
              }
            } catch (err) {
            }
          }
        }
      }
      res.end();
      return;
    }
    if (activeProvider === "anthropic") {
      const apiKey = userAnthropicKey;
      if (!apiKey) {
        res.status(400).json({ error: "Anthropic / Claude API Key is required." });
        return;
      }
      const selectedModel = activeModel || "claude-3-5-sonnet-latest";
      const claudMessages = messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content
      }));
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: selectedModel,
          system: systemPrompt,
          messages: claudMessages,
          max_tokens: 4e3,
          temperature: 0.2,
          stream: true
        })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        res.status(response.status).json({ error: errData.error?.message || "Anthropic API request failed." });
        return;
      }
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      if (fallbackWarning) {
        res.write(`data: ${JSON.stringify({ text: fallbackWarning })}

`);
      }
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      for await (const chunk of response.body) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const cleaned = line.trim();
          if (cleaned.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(cleaned.slice(6));
              if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                res.write(`data: ${JSON.stringify({ text: parsed.delta.text })}

`);
              }
            } catch (e) {
            }
          }
        }
      }
      res.end();
      return;
    }
    if (activeProvider === "deepseek") {
      const apiKey = userDeepseekKey;
      if (!apiKey) {
        res.status(400).json({ error: "DeepSeek API Key is missing. Connect your key in Settings." });
        return;
      }
      const selectedModel = activeModel || "deepseek-chat";
      const dsMessages = [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role,
          content: m.content
        }))
      ];
      const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: dsMessages,
          temperature: 0.2,
          stream: true
        })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        res.status(response.status).json({ error: errData.error?.message || "DeepSeek API request failed." });
        return;
      }
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      if (fallbackWarning) {
        res.write(`data: ${JSON.stringify({ text: fallbackWarning })}

`);
      }
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      for await (const chunk of response.body) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const cleaned = line.trim();
          if (cleaned.startsWith("data: ")) {
            const dataStr = cleaned.slice(6);
            if (dataStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(dataStr);
              const chunkText = parsed.choices?.[0]?.delta?.content || "";
              if (chunkText) {
                res.write(`data: ${JSON.stringify({ text: chunkText })}

`);
              }
            } catch (e) {
            }
          }
        }
      }
      res.end();
      return;
    }
    res.status(400).json({ error: "Unsupported AI provider." });
  } catch (error) {
    console.error("AI Proxy Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error in AI Proxy." });
  }
});
app.post("/api/ai/suggest", async (req, res) => {
  try {
    const {
      provider,
      model,
      filePath,
      fileName,
      codeBefore,
      codeAfter
    } = req.body;
    const userGeminiKey = req.headers["x-gemini-key"];
    const userOpenaiKey = req.headers["x-openai-key"];
    const userAnthropicKey = req.headers["x-anthropic-key"];
    const userDeepseekKey = req.headers["x-deepseek-key"];
    let activeProvider = provider || "gemini";
    let activeModel = model;
    if (activeProvider === "deepseek" && !userDeepseekKey) {
      activeProvider = "gemini";
      activeModel = "gemini-3.5-flash";
    } else if (activeProvider === "openai" && !userOpenaiKey) {
      activeProvider = "gemini";
      activeModel = "gemini-3.5-flash";
    } else if (activeProvider === "anthropic" && !userAnthropicKey) {
      activeProvider = "gemini";
      activeModel = "gemini-3.5-flash";
    }
    const systemPrompt = `You are a real-time inline code completion engine (ghost-text).
Output ONLY the code text that should be immediately inserted at the cursor position (which sits between the provided [BEFORE_CURSOR] and [AFTER_CURSOR] tags).
Do NOT include any markdown formatting, backticks, or code blocks.
Do NOT include any chat conversational text.
Your output must be plain code that fits perfectly when appended to the prefix text.
Keep it extremely concise (typically a single line or small block, maximum 50 tokens).`;
    const userPrompt = `File Name: ${fileName}
File Path: ${filePath}

[BEFORE_CURSOR]
${codeBefore}
[END_BEFORE_CURSOR]

[AFTER_CURSOR]
${codeAfter}
[END_AFTER_CURSOR]

Output ONLY the exact text completion to insert at the cursor.`;
    if (activeProvider === "gemini") {
      const apiKey = userGeminiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.json({ suggestion: "" });
        return;
      }
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const selectedModel = activeModel || "gemini-3.5-flash";
      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: [
          { role: "user", parts: [{ text: `${systemPrompt}

${userPrompt}` }] }
        ],
        config: {
          maxOutputTokens: 50,
          temperature: 0.1
        }
      });
      let suggestion = response.text || "";
      suggestion = suggestion.replace(/^```[a-zA-Z]*\n/, "").replace(/\n```$/, "").trimEnd();
      res.json({ suggestion });
      return;
    }
    if (activeProvider === "openai") {
      const apiKey = userOpenaiKey;
      if (!apiKey) {
        res.json({ suggestion: "" });
        return;
      }
      const selectedModel = activeModel || "gpt-4o-mini";
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          max_tokens: 50,
          temperature: 0.1
        })
      });
      if (!response.ok) {
        res.json({ suggestion: "" });
        return;
      }
      const data = await response.json();
      let suggestion = data.choices?.[0]?.message?.content || "";
      suggestion = suggestion.replace(/^```[a-zA-Z]*\n/, "").replace(/\n```$/, "").trimEnd();
      res.json({ suggestion });
      return;
    }
    if (activeProvider === "anthropic") {
      const apiKey = userAnthropicKey;
      if (!apiKey) {
        res.json({ suggestion: "" });
        return;
      }
      const selectedModel = activeModel || "claude-3-5-sonnet-latest";
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: selectedModel,
          system: systemPrompt,
          messages: [
            { role: "user", content: userPrompt }
          ],
          max_tokens: 50,
          temperature: 0.1
        })
      });
      if (!response.ok) {
        res.json({ suggestion: "" });
        return;
      }
      const data = await response.json();
      let suggestion = data.content?.[0]?.text || "";
      suggestion = suggestion.replace(/^```[a-zA-Z]*\n/, "").replace(/\n```$/, "").trimEnd();
      res.json({ suggestion });
      return;
    }
    if (activeProvider === "deepseek") {
      const apiKey = userDeepseekKey;
      if (!apiKey) {
        res.json({ suggestion: "" });
        return;
      }
      const selectedModel = activeModel || "deepseek-chat";
      const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          max_tokens: 50,
          temperature: 0.1
        })
      });
      if (!response.ok) {
        res.json({ suggestion: "" });
        return;
      }
      const data = await response.json();
      let suggestion = data.choices?.[0]?.message?.content || "";
      suggestion = suggestion.replace(/^```[a-zA-Z]*\n/, "").replace(/\n```$/, "").trimEnd();
      res.json({ suggestion });
      return;
    }
    res.json({ suggestion: "" });
  } catch (err) {
    const errMsg = err?.message || "";
    if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota")) {
      console.warn("Suggestion route quota limit active (returning empty suggestion).");
    } else {
      console.error("Suggestion route error:", err);
    }
    res.json({ suggestion: "" });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Studio IDE server successfully running on host 0.0.0.0, port ${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
