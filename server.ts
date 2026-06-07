import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// AI CHAT & CODE EDIT API PROXY
app.post("/api/ai/process", async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      provider, 
      model, 
      messages, 
      activeFile, 
      fileTree, 
      instruction, 
      mode, // "chat" or "edit"
      openTabs = [],
      recentEdits = [],
      activeSkills = []
    } = req.body;

    const userGeminiKey = req.headers["x-gemini-key"] as string;
    const userOpenaiKey = req.headers["x-openai-key"] as string;
    const userAnthropicKey = req.headers["x-anthropic-key"] as string;
    const userDeepseekKey = req.headers["x-deepseek-key"] as string;

    // Direct helper to extract active file imports (Fase 2 Context Gathering)
    const extractImports = (content?: string): string[] => {
      if (!content) return [];
      const lines = content.split("\n");
      const importLines = lines.filter(line => 
        line.trim().startsWith("import ") || 
        (line.trim().startsWith("const ") && line.includes("require("))
      );
      return importLines.map(line => line.trim());
    };
    const detectedImports = activeFile ? extractImports(activeFile.content) : [];

    // Construct skill active prompt segment
    let activeSkillsPromptPart = "";
    if (activeSkills && activeSkills.length > 0) {
      activeSkillsPromptPart = `\n=== USER ACTIVE SKILL DIRECTIVES ===\nYou MUST strictly adhere to the following customized coding rules during execution:\n`;
      activeSkills.forEach((s: any) => {
        activeSkillsPromptPart += `- [Rule Name: ${s.name}]: ${s.promptContent}\n`;
      });
      activeSkillsPromptPart += `====================================\n\n`;
    }

    const systemPrompt = `You are an elite AI coding agent executing a structured "Agentic Loop" integrated inside "AI Studio IDE".
You have full access to the user's project workspace context.
${activeSkillsPromptPart}
=== CONTEXT ENGINE ===
- Active Open File: ${activeFile ? `\x60${activeFile.path}\x60` : "None"}
- Workspace Open Tabs: ${JSON.stringify(openTabs)}
- Recent Workspace Edits: ${JSON.stringify(recentEdits)}
- Detected Active Dependencies: ${JSON.stringify(detectedImports)}
- Workspace File Tree:
${JSON.stringify(fileTree, null, 2)}

=== ACTIVE FILE CONTENTS ===
${activeFile ? `\x60\x60\x60\n${activeFile.content}\n\x60\x60\x60` : "(No file open)"}

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

    // Automated provider fallback resolution
    if (activeProvider === "deepseek" && !userDeepseekKey) {
      if (userGeminiKey || process.env.GEMINI_API_KEY) {
        activeProvider = "gemini";
        activeModel = "gemini-3.5-flash";
        fallbackWarning = "⚠️ *Nota: Se ha cambiado automáticamente al modelo de respaldo Gemini 3.5 Flash debido a que la API Key de DeepSeek en 'Ajustes' no está configurada.*\n\n";
      }
    } else if (activeProvider === "openai" && !userOpenaiKey) {
      if (userGeminiKey || process.env.GEMINI_API_KEY) {
        activeProvider = "gemini";
        activeModel = "gemini-3.5-flash";
        fallbackWarning = "⚠️ *Nota: Se ha cambiado automáticamente al modelo de respaldo Gemini 3.5 Flash debido a que la API Key de OpenAI en 'Ajustes' no está configurada.*\n\n";
      }
    } else if (activeProvider === "anthropic" && !userAnthropicKey) {
      if (userGeminiKey || process.env.GEMINI_API_KEY) {
        activeProvider = "gemini";
        activeModel = "gemini-3.5-flash";
        fallbackWarning = "⚠️ *Nota: Se ha cambiado automáticamente al modelo de respaldo Gemini 3.5 Flash debido a que la API Key de Anthropic en 'Ajustes' no está configurada.*\n\n";
      }
    }

    // 1. GEMINI PROVIDER (DEFAULT OR CUSTOM KEY)
    if (activeProvider === "gemini") {
      const apiKey = userGeminiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(400).json({ error: "Gemini API key is missing. Please configuration your key in Settings." });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      const selectedModel = activeModel || "gemini-3.5-flash";

      // Prepare Gemini contents from messages
      // messages is an array of { role: "user" | "assistant", content: string }
      const formattedContents = messages.map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));

      try {
        const responseStream = await ai.models.generateContentStream({
          model: selectedModel,
          contents: formattedContents,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.2,
          }
        });

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        if (fallbackWarning) {
          res.write(`data: ${JSON.stringify({ text: fallbackWarning })}\n\n`);
        }

        for await (const chunk of responseStream) {
          if (chunk.text) {
            res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
          }
        }
        res.end();
      } catch (err: any) {
        console.error("Gemini stream execution error:", err);
        const errMsg = err.message || "";
        const isQuota = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota") || errMsg.includes("Quota") || (err.status && err.status === 429);
        
        let customMsg = "";
        if (isQuota) {
          customMsg = `🚨 **Excedido el límite de cuota (Quota Limits / 429 / RESOURCE_EXHAUSTED)**

El servidor o la clave compartida de Gemini han alcanzado su límite de peticiones gratuitas. 

### 🔧 **Cómo solucionarlo y continuar sin límites:**
1. Haz clic en el botón de **Ajustes** ⚙️ (icono de engranaje en la esquina inferior izquierda de la interfaz).
2. Pega tu propia **Gemini API Key**. Puedes obtener una gratis y al instante en la consola de **[Google AI Studio](https://aistudio.google.com/)**.
3. ¡Guarda tu clave de API y continúa programando con peticiones rápidas, estables e ilimitadas!`;
        } else {
          customMsg = `⚠️ **Error al procesar la solicitud con Gemini:**\n\n${errMsg}\n\nPor favor, verifica tus claves en los **Ajustes** para continuar.`;
        }

        if (!res.headersSent) {
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");
        }
        res.write(`data: ${JSON.stringify({ text: customMsg })}\n\n`);
        res.end();
      }
      return;
    }

    // 2. OPENAI PROVIDER
    if (activeProvider === "openai") {
      const apiKey = userOpenaiKey;
      if (!apiKey) {
        res.status(400).json({ error: "OpenAI API Key is required for this model." });
        return;
      }

      const selectedModel = activeModel || "gpt-4o-mini";

      const openAIMessages = [
        { role: "system", content: systemPrompt },
        ...messages.map((m: any) => ({
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
        res.write(`data: ${JSON.stringify({ text: fallbackWarning })}\n\n`);
      }

      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      for await (const chunk of response.body as any) {
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
                res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
              }
            } catch (err) {
              // Ignore partial JSON
            }
          }
        }
      }

      res.end();
      return;
    }

    // 3. ANTHROPIC (CLAUDE) PROVIDER
    if (activeProvider === "anthropic") {
      const apiKey = userAnthropicKey;
      if (!apiKey) {
        res.status(400).json({ error: "Anthropic / Claude API Key is required." });
        return;
      }

      const selectedModel = activeModel || "claude-3-5-sonnet-latest";

      // Claude has system as a top level param in messages API
      const claudMessages = messages.map((m: any) => ({
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
          max_tokens: 4000,
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
        res.write(`data: ${JSON.stringify({ text: fallbackWarning })}\n\n`);
      }

      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      for await (const chunk of response.body as any) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const cleaned = line.trim();
          if (cleaned.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(cleaned.slice(6));
              if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                res.write(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`);
              }
            } catch (e) {
              // Ignore partial JSON
            }
          }
        }
      }

      res.end();
      return;
    }

    // 4. DEEPSEEK PROVIDER
    if (activeProvider === "deepseek") {
      const apiKey = userDeepseekKey;
      if (!apiKey) {
        res.status(400).json({ error: "DeepSeek API Key is missing. Connect your key in Settings." });
        return;
      }

      const selectedModel = activeModel || "deepseek-chat";

      const dsMessages = [
        { role: "system", content: systemPrompt },
        ...messages.map((m: any) => ({
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
        res.write(`data: ${JSON.stringify({ text: fallbackWarning })}\n\n`);
      }

      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      for await (const chunk of response.body as any) {
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
                res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
              }
            } catch (e) {
              // Ignore partial JSON
            }
          }
        }
      }

      res.end();
      return;
    }

    res.status(400).json({ error: "Unsupported AI provider." });
  } catch (error: any) {
    console.error("AI Proxy Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error in AI Proxy." });
  }
});

// GHOST TEXT CODE COMPLETION ENDPOINT
app.post("/api/ai/suggest", async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      provider,
      model,
      filePath,
      fileName,
      codeBefore,
      codeAfter,
    } = req.body;

    const userGeminiKey = req.headers["x-gemini-key"] as string;
    const userOpenaiKey = req.headers["x-openai-key"] as string;
    const userAnthropicKey = req.headers["x-anthropic-key"] as string;
    const userDeepseekKey = req.headers["x-deepseek-key"] as string;

    let activeProvider = provider || "gemini";
    let activeModel = model;

    // Fallbacks
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

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      const selectedModel = activeModel || "gemini-3.5-flash";

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: [
          { role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
        ],
        config: {
          maxOutputTokens: 50,
          temperature: 0.1,
        }
      });

      let suggestion = response.text || "";
      // Strip markdown code block wrappers if any
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
  } catch (err: any) {
    const errMsg = err?.message || "";
    if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota")) {
      console.warn("Suggestion route quota limit active (returning empty suggestion).");
    } else {
      console.error("Suggestion route error:", err);
    }
    res.json({ suggestion: "" });
  }
});

// START EXPRESS/VITE ENGINE
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Studio IDE server successfully running on host 0.0.0.0, port ${PORT}`);
  });
}

startServer();
