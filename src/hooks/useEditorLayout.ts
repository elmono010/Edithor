import { useState, useEffect, useCallback } from 'react';

const LOCAL_STORAGE_LAYOUTS_KEY = 'workspace_ide_layouts_v2';

interface LayoutState {
  leftTabs: string[];
  rightTabs: string[];
  activeLeftTab: string | null;
  activeRightTab: string | null;
  isSplit: boolean;
  focusedPane: 'left' | 'right';
}

export function useEditorLayout(activeWorkspaceId: string, activeFilePath: string | null) {
  const [layouts, setLayouts] = useState<Record<string, LayoutState>>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_LAYOUTS_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return {}; }
    }
    return {};
  });

  const getLayout = useCallback((): LayoutState => {
    const defaultActive = activeFilePath || null;
    const defaultTabs = defaultActive ? [defaultActive] : [];
    
    if (!layouts[activeWorkspaceId]) {
      return {
        leftTabs: defaultTabs,
        rightTabs: [],
        activeLeftTab: defaultActive,
        activeRightTab: null,
        isSplit: false,
        focusedPane: 'left'
      };
    }
    
    const layout = layouts[activeWorkspaceId];
    return {
      leftTabs: layout.leftTabs || defaultTabs,
      rightTabs: layout.rightTabs || [],
      activeLeftTab: layout.activeLeftTab || (layout.leftTabs?.length > 0 ? layout.leftTabs[0] : defaultActive),
      activeRightTab: layout.activeRightTab || (layout.rightTabs?.length > 0 ? layout.rightTabs[0] : null),
      isSplit: !!layout.isSplit,
      focusedPane: layout.focusedPane === 'right' ? 'right' : 'left'
    };
  }, [layouts, activeWorkspaceId, activeFilePath]);

  const updateLayout = useCallback((newLayout: Partial<LayoutState>) => {
    setLayouts(prev => {
      const currentLayout = getLayout();
      const updated = {
        ...prev,
        [activeWorkspaceId]: {
          ...currentLayout,
          ...newLayout
        }
      };
      localStorage.setItem(LOCAL_STORAGE_LAYOUTS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [activeWorkspaceId, getLayout]);

  const handleSelectTab = useCallback((pane: 'left' | 'right', filePath: string) => {
    if (pane === 'left') {
      updateLayout({ activeLeftTab: filePath });
    } else {
      updateLayout({ activeRightTab: filePath, focusedPane: 'right' });
    }
  }, [updateLayout]);

  const handleCloseTab = useCallback((pane: 'left' | 'right', filePath: string) => {
    const layout = getLayout();
    const isLeft = pane === 'left';
    const tabs = isLeft ? layout.leftTabs : layout.rightTabs;
    const activeTab = isLeft ? layout.activeLeftTab : layout.activeRightTab;
    
    const nextTabs = tabs.filter(t => t !== filePath);
    let nextActive = activeTab === filePath ? (nextTabs.length > 0 ? nextTabs[nextTabs.length - 1] : null) : activeTab;

    if (isLeft) {
      updateLayout({ leftTabs: nextTabs, activeLeftTab: nextActive });
    } else {
      updateLayout({ rightTabs: nextTabs, activeRightTab: nextActive });
    }
  }, [getLayout, updateLayout]);

  const handleFocusPane = useCallback((pane: 'left' | 'right') => {
    updateLayout({ focusedPane: pane });
  }, [updateLayout]);

  const handleToggleSplit = useCallback(() => {
    const layout = getLayout();
    if (!layout.isSplit) {
      // Enable split mode, duplicate current left tab to right
      const currentActive = layout.activeLeftTab;
      updateLayout({
        rightTabs: currentActive ? [currentActive] : [],
        activeRightTab: currentActive,
        isSplit: true,
        focusedPane: 'right'
      });
    } else {
      // Disable split mode
      updateLayout({
        rightTabs: [],
        activeRightTab: null,
        isSplit: false,
        focusedPane: 'left'
      });
    }
  }, [getLayout, updateLayout]);

  const handleCloseComparative = useCallback(() => {
    updateLayout({
      rightTabs: [],
      activeRightTab: null,
      isSplit: false,
      focusedPane: 'left'
    });
  }, [updateLayout]);

  const handleReorderTabs = useCallback((pane: 'left' | 'right', newTabs: string[]) => {
    if (pane === 'left') {
      updateLayout({ leftTabs: newTabs });
    } else {
      updateLayout({ rightTabs: newTabs });
    }
  }, [updateLayout]);

  return {
    currentLayout: getLayout(),
    updateLayout,
    handleSelectTab,
    handleCloseTab,
    handleFocusPane,
    handleToggleSplit,
    handleCloseComparative,
    handleReorderTabs
  };
}
