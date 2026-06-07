import { useState, useCallback } from 'react';

interface AttachedContext {
  id: string;
  type: 'file' | 'code' | 'error';
  label: string;
  content: string;
}

export function useAttachedContext() {
  const [attachedContexts, setAttachedContexts] = useState<AttachedContext[]>([]);

  const addContext = useCallback((ctx: Omit<AttachedContext, 'id'>) => {
    setAttachedContexts(prev => {
      // Avoid duplicate attachments of the same content
      if (prev.some(p => p.content === ctx.content)) {
        return prev;
      }
      return [...prev, { ...ctx, id: `ctx-${Date.now()}-${Math.random()}` }];
    });
  }, []);

  const removeContext = useCallback((contextId: string) => {
    setAttachedContexts(prev => prev.filter(c => c.id !== contextId));
  }, []);

  const clearContexts = useCallback(() => {
    setAttachedContexts([]);
  }, []);

  const getContextSummary = useCallback((): string => {
    if (attachedContexts.length === 0) return '';
    
    return attachedContexts.map(ctx => 
      `[${ctx.type.toUpperCase()}] ${ctx.label}:\n${ctx.content}`
    ).join('\n\n');
  }, [attachedContexts]);

  return {
    attachedContexts,
    addContext,
    removeContext,
    clearContexts,
    getContextSummary
  };
}
