import { useState, useEffect, useCallback } from 'react';

interface MultiplayerCursor {
  id: string;
  username: string;
  color: string;
  line: number;
  col: number;
  typingText?: string;
}

interface MultiplayerPeer {
  id: string;
  username: string;
  color: string;
  active: boolean;
  avatar: string;
}

const LOCAL_STORAGE_MULTIPLAYER_KEY = 'simulated_multiplayer';

export function useMultiplayer() {
  const [isMultiplayerActive, setIsMultiplayerActive] = useState(() => {
    try {
      return localStorage.getItem(LOCAL_STORAGE_MULTIPLAYER_KEY) === 'true';
    } catch(e) {
      return false;
    }
  });

  const [multiplayerCursors, setMultiplayerCursors] = useState<MultiplayerCursor[]>([]);
  const [multiplayerPeers, setMultiplayerPeers] = useState<MultiplayerPeer[]>([
    { id: 'elena', username: 'Elena (Sra. Architect)', color: '#f43f5e', active: false, avatar: '👩‍💻' },
    { id: 'santi', username: 'Santi (DevOps)', color: '#f59e0b', active: false, avatar: '👨‍💻' },
    { id: 'lucas', username: 'Lucas (Jr. Frontend)', color: '#10b981', active: false, avatar: '👦' }
  ]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_MULTIPLAYER_KEY, String(isMultiplayerActive));
  }, [isMultiplayerActive]);

  const toggleMultiplayer = useCallback(() => {
    setIsMultiplayerActive(prev => !prev);
  }, []);

  const updateCursorPosition = useCallback((cursorId: string, line: number, col: number, typingText?: string) => {
    setMultiplayerCursors(prev => {
      const existing = prev.find(c => c.id === cursorId);
      if (existing) {
        return prev.map(c => c.id === cursorId ? { ...c, line, col, typingText } : c);
      }
      return prev;
    });
  }, []);

  const addSimulatedCursor = useCallback((cursor: Omit<MultiplayerCursor, 'id'>) => {
    const newCursor: MultiplayerCursor = {
      ...cursor,
      id: `cursor-${Date.now()}`
    };
    setMultiplayerCursors(prev => [...prev, newCursor]);
  }, []);

  const removeSimulatedCursor = useCallback((cursorId: string) => {
    setMultiplayerCursors(prev => prev.filter(c => c.id !== cursorId));
  }, []);

  const togglePeerActive = useCallback((peerId: string) => {
    setMultiplayerPeers(prev => prev.map(p => 
      p.id === peerId ? { ...p, active: !p.active } : p
    ));
  }, []);

  const simulateRemoteTyping = useCallback(() => {
    if (!isMultiplayerActive || multiplayerPeers.filter(p => p.active).length === 0) return;

    const activePeers = multiplayerPeers.filter(p => p.active);
    const randomPeer = activePeers[Math.floor(Math.random() * activePeers.length)];
    
    // Simulate cursor movement
    const randomLine = Math.floor(Math.random() * 50) + 1;
    const randomCol = Math.floor(Math.random() * 80) + 1;
    
    updateCursorPosition(randomPeer.id, randomLine, randomCol, 'typing...');
    
    // Clear typing after delay
    setTimeout(() => {
      updateCursorPosition(randomPeer.id, randomLine, randomCol, undefined);
    }, 2000);
  }, [isMultiplayerActive, multiplayerPeers, updateCursorPosition]);

  // Auto-simulate when multiplayer is active
  useEffect(() => {
    if (!isMultiplayerActive) {
      setMultiplayerCursors([]);
      return;
    }

    const interval = setInterval(simulateRemoteTyping, 5000);
    return () => clearInterval(interval);
  }, [isMultiplayerActive, simulateRemoteTyping]);

  return {
    isMultiplayerActive,
    setIsMultiplayerActive,
    multiplayerCursors,
    multiplayerPeers,
    toggleMultiplayer,
    updateCursorPosition,
    addSimulatedCursor,
    removeSimulatedCursor,
    togglePeerActive,
    simulateRemoteTyping
  };
}
