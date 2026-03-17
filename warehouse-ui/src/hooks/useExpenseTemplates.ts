import { useState, useCallback } from 'react';

const STORAGE_KEY = 'expense_templates';

export function useExpenseTemplates() {
  const load = (): string[] => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    } catch {
      return [];
    }
  };

  const [templates, setTemplates] = useState<string[]>(load);

  const saveTemplate = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setTemplates(prev => {
      if (prev.includes(trimmed)) return prev;
      const next = [trimmed, ...prev].slice(0, 50);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeTemplate = useCallback((text: string) => {
    setTemplates(prev => {
      const next = prev.filter(t => t !== text);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { templates, saveTemplate, removeTemplate };
}
