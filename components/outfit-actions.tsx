'use client';

import { useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';

interface OutfitActionsProps {
  onRegenerate: () => void;
  onSave: (loved: boolean) => Promise<void>;
  disabled: boolean;
}

export default function OutfitActions({ onRegenerate, onSave, disabled }: OutfitActionsProps) {
  const [saving, setSaving] = useState(false);
  
  const handleSave = async (loved: boolean) => {
    setSaving(true);
    try {
      await onSave(loved);
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => handleSave(false)}
        disabled={disabled || saving}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        aria-label="Save outfit"
      >
        <Save className="w-4 h-4" aria-hidden="true" />
        Save Outfit
      </button>
      
      <button
        onClick={onRegenerate}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800"
        aria-label="Regenerate outfit"
      >
        <RefreshCw className="w-4 h-4" aria-hidden="true" />
        Regenerate
      </button>
    </div>
  );
}
