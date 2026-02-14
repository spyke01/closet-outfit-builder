'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import { AIIcon } from './ai-icon';

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
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        aria-label="Save outfit"
      >
        <Save className="w-4 h-4" aria-hidden="true" />
        Save Outfit
      </button>
      
      <button
        onClick={onRegenerate}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-foreground bg-card"
        aria-label="Regenerate outfit"
      >
        <AIIcon className="w-4 h-4" />
        Regenerate
      </button>
    </div>
  );
}
