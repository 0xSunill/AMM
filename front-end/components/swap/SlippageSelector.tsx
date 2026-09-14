"use client";

import { DEFAULT_SLIPPAGE_BPS } from "@/lib/solana/constants";

const PRESETS = [
  { label: "0.1%", value: 10 },
  { label: "0.5%", value: 50 },
  { label: "1.0%", value: 100 },
];

interface SlippageSelectorProps {
  value: number;
  onChange: (bps: number) => void;
}

export function SlippageSelector({ value, onChange }: SlippageSelectorProps) {
  const isCustom = !PRESETS.some((p) => p.value === value);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-muted mr-1">Slippage:</span>
      <div className="flex items-center gap-1 bg-bg-primary/50 rounded-lg p-0.5">
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            onClick={() => onChange(preset.value)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              value === preset.value
                ? "bg-accent-primary/15 text-accent-secondary"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {preset.label}
          </button>
        ))}
        <div className="relative">
          <input
            type="number"
            min="1"
            max="5000"
            step="1"
            placeholder="Custom"
            value={isCustom ? (value / 100).toFixed(1) : ""}
            onChange={(e) => {
              const pct = parseFloat(e.target.value);
              if (!isNaN(pct) && pct > 0 && pct <= 50) {
                onChange(Math.round(pct * 100));
              }
            }}
            className={`w-16 px-2 py-1 rounded-md text-xs bg-transparent outline-none text-center ${
              isCustom
                ? "bg-accent-primary/15 text-accent-secondary"
                : "text-text-muted"
            }`}
            aria-label="Custom slippage percentage"
          />
          {isCustom && (
            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-text-muted">
              %
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export { DEFAULT_SLIPPAGE_BPS };
