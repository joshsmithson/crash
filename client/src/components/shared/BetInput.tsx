interface BetInputProps {
  value: string;
  onChange: (value: string) => void;
  onHalf: () => void;
  onDouble: () => void;
  onMax: () => void;
  error: string | null;
  disabled?: boolean;
  label?: string;
}

export function BetInput({
  value,
  onChange,
  onHalf,
  onDouble,
  onMax,
  error,
  disabled = false,
  label = "Bet Amount",
}: BetInputProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-text-secondary">{label}</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          {/* Credit icon */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" opacity="0.2" />
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H11.5v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.65c.09 1.72 1.38 2.69 2.85 2.99V19h1.72v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.64-3.42z" />
            </svg>
          </div>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="input-field w-full pl-9 pr-3"
            placeholder="0.00"
          />
        </div>

        {/* Quick buttons */}
        <div className="flex gap-1">
          <button
            onClick={onHalf}
            disabled={disabled}
            className="px-2.5 py-2 rounded-lg bg-bg border border-border text-text-secondary text-xs font-semibold hover:bg-surface-hover hover:text-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            &frac12;
          </button>
          <button
            onClick={onDouble}
            disabled={disabled}
            className="px-2.5 py-2 rounded-lg bg-bg border border-border text-text-secondary text-xs font-semibold hover:bg-surface-hover hover:text-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            2x
          </button>
          <button
            onClick={onMax}
            disabled={disabled}
            className="px-2.5 py-2 rounded-lg bg-bg border border-border text-text-secondary text-xs font-semibold hover:bg-surface-hover hover:text-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Max
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="text-xs text-danger animate-slide-up">{error}</div>
      )}
    </div>
  );
}
