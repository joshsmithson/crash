import { useState, useEffect } from "react";
import { hashSeed } from "../../lib/provablyFair";

interface ProvablyFairModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProvablyFairModal({ isOpen, onClose }: ProvablyFairModalProps) {
  const [clientSeed, setClientSeed] = useState("your-custom-seed");
  const [serverSeedHash, setServerSeedHash] = useState("");
  const [nonce, setNonce] = useState(0);
  const [newClientSeed, setNewClientSeed] = useState("");
  const [isRotating, setIsRotating] = useState(false);
  const [revealedServerSeed, setRevealedServerSeed] = useState<string | null>(null);

  // Generate mock server seed hash on mount
  useEffect(() => {
    const mockServerSeed = `server-seed-${Date.now()}`;
    hashSeed(mockServerSeed).then(setServerSeedHash);
  }, []);

  const handleRotate = async () => {
    setIsRotating(true);

    // Simulate rotating seeds
    // In production: reveal old server seed, generate new one, set new client seed
    const oldServerSeed = `revealed-server-seed-${Date.now() - 1000}`;
    setRevealedServerSeed(oldServerSeed);

    if (newClientSeed.trim()) {
      setClientSeed(newClientSeed.trim());
      setNewClientSeed("");
    }

    const newServerSeed = `server-seed-${Date.now()}`;
    const hash = await hashSeed(newServerSeed);
    setServerSeedHash(hash);
    setNonce(0);

    setTimeout(() => setIsRotating(false), 500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-surface border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-bounce-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-text">Provably Fair</h2>
              <p className="text-xs text-text-secondary">Verify every bet is fair</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Server Seed Hash */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">
              Server Seed Hash (SHA-256)
            </label>
            <div className="input-field text-xs break-all p-3 bg-bg cursor-text select-all">
              {serverSeedHash || "Loading..."}
            </div>
            <p className="text-[11px] text-text-secondary">
              This hash is committed before each round. After rotation, the server seed is revealed.
            </p>
          </div>

          {/* Revealed server seed */}
          {revealedServerSeed && (
            <div className="space-y-1.5 animate-slide-down">
              <label className="text-sm font-medium text-success">
                Previous Server Seed (Revealed)
              </label>
              <div className="input-field text-xs break-all p-3 bg-success/5 border-success/20">
                {revealedServerSeed}
              </div>
            </div>
          )}

          {/* Client Seed */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">
              Active Client Seed
            </label>
            <div className="input-field text-sm p-3 bg-bg">
              {clientSeed}
            </div>
          </div>

          {/* Nonce */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">
              Nonce
            </label>
            <div className="input-field text-sm p-3 bg-bg font-mono">
              {nonce}
            </div>
            <p className="text-[11px] text-text-secondary">
              Increments with each bet. Ensures unique outcomes.
            </p>
          </div>

          {/* Change client seed */}
          <div className="space-y-1.5 pt-3 border-t border-border">
            <label className="text-sm font-medium text-text-secondary">
              New Client Seed (applied on rotation)
            </label>
            <input
              type="text"
              value={newClientSeed}
              onChange={(e) => setNewClientSeed(e.target.value)}
              placeholder="Enter a new client seed..."
              className="input-field w-full text-sm"
            />
          </div>

          {/* Rotate button */}
          <button
            onClick={handleRotate}
            disabled={isRotating}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2"
          >
            <svg
              className={`w-4 h-4 ${isRotating ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isRotating ? "Rotating..." : "Rotate Seeds"}
          </button>

          {/* Info box */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-primary mb-2">How it works</h4>
            <ol className="text-xs text-text-secondary space-y-1.5 list-decimal list-inside">
              <li>Before each game, we commit a server seed hash (SHA-256).</li>
              <li>You set your client seed. Combined with the nonce, it determines outcomes.</li>
              <li>After rotation, the previous server seed is revealed so you can verify.</li>
              <li>Use the verification page to independently verify any past bet.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
