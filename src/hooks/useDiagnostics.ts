import { useState, useCallback } from 'react';
import { DiagnosticItem } from '../types';

export function useDiagnostics() {
  const [aiDiagnostics, setAiDiagnostics] = useState<DiagnosticItem[]>([]);
  const [lspDiagnostics, setLspDiagnostics] = useState<Record<string, DiagnosticItem[]>>({});

  const addAiDiagnostic = useCallback((diagnostic: DiagnosticItem) => {
    setAiDiagnostics(prev => {
      if (prev.some(d => d.id === diagnostic.id)) {
        return prev.map(d => d.id === diagnostic.id ? diagnostic : d);
      }
      return [...prev, diagnostic];
    });
  }, []);

  const removeAiDiagnostic = useCallback((diagnosticId: string) => {
    setAiDiagnostics(prev => prev.filter(d => d.id !== diagnosticId));
  }, []);

  const clearAiDiagnostics = useCallback(() => {
    setAiDiagnostics([]);
  }, []);

  const updateLspDiagnostics = useCallback((filePath: string, diagnostics: DiagnosticItem[]) => {
    setLspDiagnostics(prev => ({
      ...prev,
      [filePath]: diagnostics
    }));
  }, []);

  const getDiagnosticsForFile = useCallback((filePath: string): DiagnosticItem[] => {
    const lspDiags = lspDiagnostics[filePath] || [];
    const aiDiags = aiDiagnostics.filter(d => {
      // AI diagnostics might be associated with the currently active file
      return true; // Could add filtering logic here
    });
    return [...lspDiags, ...aiDiags];
  }, [lspDiagnostics, aiDiagnostics]);

  const getAllActiveDiagnostics = useCallback((): DiagnosticItem[] => {
    const allLsp = Object.values(lspDiagnostics).flat();
    return [...allLsp, ...aiDiagnostics];
  }, [lspDiagnostics, aiDiagnostics]);

  return {
    aiDiagnostics,
    lspDiagnostics,
    addAiDiagnostic,
    removeAiDiagnostic,
    clearAiDiagnostics,
    updateLspDiagnostics,
    getDiagnosticsForFile,
    getAllActiveDiagnostics
  };
}
