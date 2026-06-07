import { useState, useCallback } from 'react';

interface ProposedEdit {
  filePath: string;
  originalContent: string;
  newContent: string;
  description?: string;
}

export function useProposedEdits() {
  const [proposedEdits, setProposedEdits] = useState<ProposedEdit[]>([]);

  const addProposedEdit = useCallback((edit: ProposedEdit) => {
    setProposedEdits(prev => {
      // Check if there's already an edit for this file
      const existingIndex = prev.findIndex(e => e.filePath === edit.filePath);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = edit;
        return updated;
      }
      return [...prev, edit];
    });
  }, []);

  const acceptEdit = useCallback((filePath: string) => {
    setProposedEdits(prev => {
      const edit = prev.find(e => e.filePath === filePath);
      if (!edit) return prev;
      
      // Return the remaining edits after accepting this one
      return prev.filter(e => e.filePath !== filePath);
    });
  }, []);

  const rejectEdit = useCallback((filePath: string) => {
    setProposedEdits(prev => prev.filter(e => e.filePath !== filePath));
  }, []);

  const clearAllEdits = useCallback(() => {
    setProposedEdits([]);
  }, []);

  const getEditForFile = useCallback((filePath: string): ProposedEdit | undefined => {
    return proposedEdits.find(e => e.filePath === filePath);
  }, [proposedEdits]);

  const hasPendingEdits = useCallback((): boolean => {
    return proposedEdits.length > 0;
  }, [proposedEdits]);

  return {
    proposedEdits,
    addProposedEdit,
    acceptEdit,
    rejectEdit,
    clearAllEdits,
    getEditForFile,
    hasPendingEdits
  };
}
