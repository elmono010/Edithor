import { useState, useEffect, useCallback } from 'react';
import { LLMConfig } from '../types';

const LOCAL_STORAGE_LLM_CONFIG_KEY = 'workspace_ide_llm_config';

const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: 'gemini',
  model: 'gemini-3.5-flash',
  geminiKey: '',
  openaiKey: '',
  anthropicKey: '',
  deepseekKey: ''
};

export function useLLMConfig() {
  const [llmConfig, setLlmConfig] = useState<LLMConfig>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_LLM_CONFIG_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_LLM_CONFIG;
  });

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_LLM_CONFIG_KEY, JSON.stringify(llmConfig));
  }, [llmConfig]);

  const updateProvider = useCallback((provider: LLMConfig['provider']) => {
    setLlmConfig(prev => ({ ...prev, provider }));
  }, []);

  const updateModel = useCallback((model: string) => {
    setLlmConfig(prev => ({ ...prev, model }));
  }, []);

  const updateApiKey = useCallback((keyType: keyof Omit<LLMConfig, 'provider' | 'model'>, value: string) => {
    setLlmConfig(prev => ({ ...prev, [keyType]: value }));
  }, []);

  return {
    llmConfig,
    setLlmConfig,
    updateProvider,
    updateModel,
    updateApiKey
  };
}
