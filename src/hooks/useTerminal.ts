import { useState, useCallback } from 'react';

interface TerminalOutput {
  id: string;
  text: string;
  timestamp: number;
  type?: 'info' | 'error' | 'success' | 'warning';
}

export function useTerminal(initialOutputs: TerminalOutput[] = []) {
  const [terminalOutputs, setTerminalOutputs] = useState<TerminalOutput[]>(initialOutputs);
  const [terminalInput, setTerminalInput] = useState('');

  const appendTerminalOutput = useCallback((text: string, type: TerminalOutput['type'] = 'info') => {
    setTerminalOutputs(prev => [...prev, {
      id: `out-${Date.now()}-${Math.random()}`,
      text,
      timestamp: Date.now(),
      type
    }]);
  }, []);

  const clearTerminal = useCallback(() => {
    setTerminalOutputs([]);
  }, []);

  const handleTerminalInputSubmit = useCallback((command: string) => {
    appendTerminalOutput(`$ ${command}`, 'info');
    // Command processing would be handled externally
    setTerminalInput('');
    return command;
  }, [appendTerminalOutput]);

  return {
    terminalOutputs,
    setTerminalOutputs,
    terminalInput,
    setTerminalInput,
    appendTerminalOutput,
    clearTerminal,
    handleTerminalInputSubmit
  };
}
