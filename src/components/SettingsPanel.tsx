import React from "react";
import { LLMConfig } from "../types";
import { X, Key, Shield, HelpCircle, CheckCircle } from "lucide-react";

interface SettingsPanelProps {
  config: LLMConfig;
  onChange: (config: LLMConfig) => void;
  onClose: () => void;
}

export default function SettingsPanel({ config, onChange, onClose }: SettingsPanelProps) {
  const handleKeyChange = (provider: keyof LLMConfig, val: string) => {
    onChange({
      ...config,
      [provider]: val
    });
  };

  const handleProviderChange = (prov: LLMConfig["provider"]) => {
    let fallbackModel = "gemini-3.5-flash";
    if (prov === "openai") fallbackModel = "gpt-4o-mini";
    if (prov === "anthropic") fallbackModel = "claude-3-5-sonnet-latest";
    if (prov === "deepseek") fallbackModel = "deepseek-chat";

    onChange({
      ...config,
      provider: prov,
      model: fallbackModel
    });
  };

  const currentModels = {
    gemini: ["gemini-3.5-flash", "gemini-3.1-pro-preview", "gemini-3.1-flash-lite"],
    openai: ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"],
    anthropic: ["claude-3-5-sonnet-latest", "claude-3-opus-20240229", "claude-3-haiku-20240307"],
    deepseek: ["deepseek-chat", "deepseek-coder"]
  };

  return (
    <div id="settings-modal" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        id="settings-content" 
        className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in duration-200"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-sky-400" />
            <h3 className="font-semibold text-lg text-slate-100">LLM Provider Config</h3>
          </div>
          <button 
            id="close-settings-btn"
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 hover:bg-slate-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          <div className="p-3.5 bg-slate-950/50 border border-slate-800 rounded-lg flex items-start gap-3">
            <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-400 leading-relaxed">
              <span className="font-semibold text-slate-200 block mb-0.5">Seguridad de tus API Keys</span>
              Las API keys se guardan exclusivamente en el almacenamiento local de tu navegador. 
              Son enviadas por HTTPS seguro al servidor proxy únicamente tras iniciar peticiones de IA, manteniendo tu entorno seguro y libre de CORS.
            </div>
          </div>

          {/* Active Provider */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Proveedor Inteligencia Activa</label>
            <div className="grid grid-cols-2 gap-2">
              {(["gemini", "openai", "anthropic", "deepseek"] as const).map((prov) => (
                <button
                  id={`prov-btn-${prov}`}
                  key={prov}
                  onClick={() => handleProviderChange(prov)}
                  className={`py-2 px-3 border rounded-lg text-sm font-medium flex items-center justify-between transition-all capitalize ${
                    config.provider === prov
                      ? "bg-slate-800 border-sky-500 text-sky-400"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  {prov}
                  {config.provider === prov && <CheckCircle className="w-4 h-4 text-sky-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Modelo del Proveedor</label>
            <select
              id="model-selector"
              value={config.model}
              onChange={(e) => onChange({ ...config, model: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
            >
              {currentModels[config.provider].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="border-t border-slate-800/80 pt-5 space-y-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Tus Tokens de Acceso</h4>

            {/* Gemini */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-slate-400">Gemini Key</label>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  {config.geminiKey ? "Configurada" : "Listo (Server Key Disponible)"}
                </span>
              </div>
              <input
                id="gemini-key-input"
                type="password"
                placeholder={config.geminiKey ? "•••••••••••••••••••••••••••••" : "Dejar vacío para usar Gemini Free de Google AI Studio"}
                value={config.geminiKey}
                onChange={(e) => handleKeyChange("geminiKey", e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* OpenAI */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">OpenAI API Key (sk-...)</label>
              <input
                id="openai-key-input"
                type="password"
                placeholder="sk-•••••••••••••••••••••••••••••"
                value={config.openaiKey}
                onChange={(e) => handleKeyChange("openaiKey", e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Anthropic */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Anthropic Claude Key (sk-ant-...)</label>
              <input
                id="anthropic-key-input"
                type="password"
                placeholder="sk-ant-•••••••••••••••••••••••••••••"
                value={config.anthropicKey}
                onChange={(e) => handleKeyChange("anthropicKey", e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* DeepSeek */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">DeepSeek Key (sk-...)</label>
              <input
                id="deepseek-key-input"
                type="password"
                placeholder="sk-•••••••••••••••••••••••••••••"
                value={config.deepseekKey}
                onChange={(e) => handleKeyChange("deepseekKey", e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end">
          <button
            id="save-settings-btn"
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-500 text-white rounded-lg text-xs font-semibold hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            Guardar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
