import { createContext, useContext, useMemo, useState, ReactNode } from 'react';

type UnsavedChangesContextValue = {
  dirty: boolean;
  setDirty: (dirty: boolean) => void;
};

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | undefined>(undefined);

export const UnsavedChangesProvider = ({ children }: { children: ReactNode }) => {
  const [dirty, setDirty] = useState(false);

  const value = useMemo(() => ({ dirty, setDirty }), [dirty]);

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
    </UnsavedChangesContext.Provider>
  );
};

export const useUnsavedChanges = () => {
  const context = useContext(UnsavedChangesContext);
  if (!context) {
    throw new Error('useUnsavedChanges must be used within UnsavedChangesProvider');
  }
  return context;
};
