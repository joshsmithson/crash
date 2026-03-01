import { useState } from "react";
import {
  verifyCrashPoint,
  verifyRouletteResult,
  verifyCoinFlip,
  verifyPlinkoPath,
  verifyCaseRoll,
  hashSeed,
  rouletteResultToColor,
} from "../lib/provablyFair";
import { ProvablyFairModal } from "../components/shared/ProvablyFairModal";

type VerifyGame = "crash" | "roulette" | "coinflip" | "plinko" | "cases";

interface VerifyResult {
  game: VerifyGame;
  result: string;
  details: string;
  verified: boolean;
}

export function ProvablyFairPage() {
  const [activeGame, setActiveGame] = useState<VerifyGame>("crash");
  const [serverSeed, setServerSeed] = useState("");
  const [clientSeed, setClientSeed] = useState("");
  const [nonce, setNonce] = useState("0");
  const [houseEdge, setHouseEdge] = useState("0.04");
  const [plinkoRows, setPlinkoRows] = useState("12");
  const [totalWeight, setTotalWeight] = useState("1000");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [hashOutput, setHashOutput] = useState("");

  const handleVerify = async () => {
    if (!serverSeed || !clientSeed) return;
    setLoading(true);
    setResult(null);

    try {
      const n = parseInt(nonce) || 0;

      switch (activeGame) {
        case "crash": {
          const edge = parseFloat(houseEdge) || 0.04;
          const crashPoint = await verifyCrashPoint(serverSeed, clientSeed, n, edge);
          setResult({
            game: "crash",
            result: `${crashPoint.toFixed(2)}x`,
            details: `Crash point: ${crashPoint.toFixed(2)}x\nHouse edge: ${(edge * 100).toFixed(1)}%\nServer seed: ${serverSeed}\nClient seed: ${clientSeed}\nNonce: ${n}`,
            verified: true,
          });
          break;
        }
        case "roulette": {
          const slot = await verifyRouletteResult(serverSeed, clientSeed, n);
          const color = rouletteResultToColor(slot);
          setResult({
            game: "roulette",
            result: `Slot ${slot} (${color})`,
            details: `Result slot: ${slot}\nColor: ${color}\nMultiplier: ${color === "green" ? "14x" : "2x"}\nServer seed: ${serverSeed}\nClient seed: ${clientSeed}\nNonce: ${n}`,
            verified: true,
          });
          break;
        }
        case "coinflip": {
          const side = await verifyCoinFlip(serverSeed, clientSeed, n);
          setResult({
            game: "coinflip",
            result: side,
            details: `Side: ${side}\n${side === "CT" ? "Counter-Terrorist wins" : "Terrorist wins"}\nServer seed: ${serverSeed}\nClient seed: ${clientSeed}\nNonce: ${n}`,
            verified: true,
          });
          break;
        }
        case "plinko": {
          const rows = parseInt(plinkoRows) || 12;
          const { path, bucket } = await verifyPlinkoPath(serverSeed, clientSeed, n, rows);
          setResult({
            game: "plinko",
            result: `Bucket ${bucket}`,
            details: `Bucket: ${bucket} (of ${rows + 1} buckets)\nPath: ${path.map((d) => (d === 0 ? "L" : "R")).join(" ")}\nRows: ${rows}\nServer seed: ${serverSeed}\nClient seed: ${clientSeed}\nNonce: ${n}`,
            verified: true,
          });
          break;
        }
        case "cases": {
          const tw = parseInt(totalWeight) || 1000;
          const roll = await verifyCaseRoll(serverSeed, clientSeed, n, tw);
          setResult({
            game: "cases",
            result: `Roll: ${roll}`,
            details: `Roll value: ${roll} (of ${tw} total weight)\nCompare against item weight ranges to determine the won item.\nServer seed: ${serverSeed}\nClient seed: ${clientSeed}\nNonce: ${n}`,
            verified: true,
          });
          break;
        }
      }
    } catch (err) {
      setResult({
        game: activeGame,
        result: "Error",
        details: `Verification failed: ${err}`,
        verified: false,
      });
    }

    setLoading(false);
  };

  const handleHashSeed = async () => {
    if (!serverSeed) return;
    const hash = await hashSeed(serverSeed);
    setHashOutput(hash);
  };

  const games: { id: VerifyGame; label: string; icon: string }[] = [
    { id: "crash", label: "Crash", icon: "\u{1F680}" },
    { id: "roulette", label: "Roulette", icon: "\u{1F534}" },
    { id: "coinflip", label: "Coin Flip", icon: "\u{1FA99}" },
    { id: "plinko", label: "Plinko", icon: "\u{1F53B}" },
    { id: "cases", label: "Cases", icon: "\u{1F4E6}" },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text flex items-center gap-2">
            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Provably Fair
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Independently verify the fairness of any past bet
          </p>
        </div>
        <button
          onClick={() => setShowSeedModal(true)}
          className="btn-ghost flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          My Seeds
        </button>
      </div>

      {/* How it works */}
      <div className="card bg-primary/5 border-primary/20">
        <h3 className="text-sm font-bold text-primary mb-3">How Provably Fair Works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="space-y-1">
            <div className="text-primary font-semibold">1. Commitment</div>
            <p className="text-text-secondary text-xs">
              Before each game, the server commits to a seed by publishing its SHA-256 hash.
              This ensures the outcome cannot be changed.
            </p>
          </div>
          <div className="space-y-1">
            <div className="text-primary font-semibold">2. Generation</div>
            <p className="text-text-secondary text-xs">
              The game outcome is determined by HMAC-SHA256(serverSeed, clientSeed:nonce).
              Your client seed and incrementing nonce make each bet unique.
            </p>
          </div>
          <div className="space-y-1">
            <div className="text-primary font-semibold">3. Verification</div>
            <p className="text-text-secondary text-xs">
              After seed rotation, the server seed is revealed. You can verify that its hash
              matches and recalculate any outcome on this page.
            </p>
          </div>
        </div>
      </div>

      {/* Game selector */}
      <div className="flex gap-1 p-1 bg-surface rounded-xl border border-border overflow-x-auto">
        {games.map((game) => (
          <button
            key={game.id}
            onClick={() => {
              setActiveGame(game.id);
              setResult(null);
            }}
            className={`
              flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap
              ${
                activeGame === game.id
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-text-secondary hover:text-text hover:bg-surface-hover"
              }
            `}
          >
            <span>{game.icon}</span>
            <span className="hidden sm:inline">{game.label}</span>
          </button>
        ))}
      </div>

      {/* Verification form */}
      <div className="card space-y-4">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
          Verify {games.find((g) => g.id === activeGame)?.label} Result
        </h3>

        {/* Common inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm text-text-secondary font-medium">Server Seed</label>
            <input
              type="text"
              value={serverSeed}
              onChange={(e) => setServerSeed(e.target.value)}
              placeholder="Revealed server seed"
              className="input-field w-full text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-text-secondary font-medium">Client Seed</label>
            <input
              type="text"
              value={clientSeed}
              onChange={(e) => setClientSeed(e.target.value)}
              placeholder="Your client seed"
              className="input-field w-full text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm text-text-secondary font-medium">Nonce</label>
            <input
              type="text"
              value={nonce}
              onChange={(e) => setNonce(e.target.value)}
              placeholder="0"
              className="input-field w-full text-sm"
            />
          </div>

          {/* Game-specific inputs */}
          {activeGame === "crash" && (
            <div className="space-y-1.5">
              <label className="text-sm text-text-secondary font-medium">
                House Edge (default: 0.04)
              </label>
              <input
                type="text"
                value={houseEdge}
                onChange={(e) => setHouseEdge(e.target.value)}
                placeholder="0.04"
                className="input-field w-full text-sm"
              />
            </div>
          )}

          {activeGame === "plinko" && (
            <div className="space-y-1.5">
              <label className="text-sm text-text-secondary font-medium">Rows</label>
              <select
                value={plinkoRows}
                onChange={(e) => setPlinkoRows(e.target.value)}
                className="input-field w-full text-sm bg-bg"
              >
                <option value="8">8 rows</option>
                <option value="12">12 rows</option>
                <option value="16">16 rows</option>
              </select>
            </div>
          )}

          {activeGame === "cases" && (
            <div className="space-y-1.5">
              <label className="text-sm text-text-secondary font-medium">Total Weight</label>
              <input
                type="text"
                value={totalWeight}
                onChange={(e) => setTotalWeight(e.target.value)}
                placeholder="1000"
                className="input-field w-full text-sm"
              />
            </div>
          )}
        </div>

        <button
          onClick={handleVerify}
          disabled={loading || !serverSeed || !clientSeed}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2"
        >
          {loading ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {loading ? "Verifying..." : "Verify Result"}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div
          className={`
            card animate-slide-up
            ${result.verified ? "border-success/30" : "border-danger/30"}
          `}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`
                w-10 h-10 rounded-full flex items-center justify-center
                ${result.verified ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}
              `}
            >
              {result.verified ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div>
              <h3 className="font-bold text-text">
                {result.verified ? "Verification Successful" : "Verification Failed"}
              </h3>
              <p className="text-sm text-text-secondary capitalize">{result.game}</p>
            </div>
            <div className="ml-auto text-right">
              <div className="text-2xl font-mono font-bold text-primary">
                {result.result}
              </div>
            </div>
          </div>

          <pre className="bg-bg rounded-lg p-4 text-xs text-text-secondary overflow-x-auto font-mono whitespace-pre-wrap border border-border">
            {result.details}
          </pre>
        </div>
      )}

      {/* Hash tool */}
      <div className="card space-y-4">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
          SHA-256 Hash Tool
        </h3>
        <p className="text-xs text-text-secondary">
          Verify that a server seed matches its previously published hash.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={serverSeed}
            onChange={(e) => setServerSeed(e.target.value)}
            placeholder="Paste server seed to hash"
            className="input-field flex-1 text-sm"
          />
          <button onClick={handleHashSeed} className="btn-ghost px-4">
            Hash
          </button>
        </div>
        {hashOutput && (
          <div className="bg-bg rounded-lg p-3 text-xs font-mono text-primary break-all border border-border">
            {hashOutput}
          </div>
        )}
      </div>

      {/* Seed modal */}
      <ProvablyFairModal isOpen={showSeedModal} onClose={() => setShowSeedModal(false)} />
    </div>
  );
}
