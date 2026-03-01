import { useState } from "react";
import { useGame, type CaseBattle } from "../../../lib/gameContext";
import { BattleGame } from "./BattleGame";
import { BattleResults } from "./BattleResults";
import { formatCredits } from "../../../lib/formatCredits";

export function BattleLobby() {
  const { state, dispatch } = useGame();
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);

  const activeBattle = state.caseBattles.battles.find((b) => b.id === activeBattleId);

  if (activeBattle) {
    if (activeBattle.status === "complete") {
      return (
        <BattleResults
          battle={activeBattle}
          onBack={() => setActiveBattleId(null)}
        />
      );
    }
    return (
      <BattleGame
        battle={activeBattle}
        onBack={() => setActiveBattleId(null)}
      />
    );
  }

  const waitingBattles = state.caseBattles.battles.filter((b) => b.status === "waiting");
  const activeBattles = state.caseBattles.battles.filter((b) => b.status === "in_progress");
  const completedBattles = state.caseBattles.battles.filter((b) => b.status === "complete");

  const handleJoinBattle = (battle: CaseBattle) => {
    if (!state.user || state.user.balance < battle.costPerPlayer) return;

    dispatch({ type: "SET_BALANCE", payload: state.user.balance - battle.costPerPlayer });

    const updatedBattle: CaseBattle = {
      ...battle,
      players: [
        ...battle.players,
        { userId: state.user.identity, username: state.user.username, totalValue: 0, results: [] },
      ],
      status: battle.players.length + 1 >= battle.maxPlayers ? "in_progress" : "waiting",
    };

    dispatch({ type: "BATTLES_UPDATE", payload: updatedBattle });
    setActiveBattleId(updatedBattle.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Case Battles</h1>
          <p className="text-text-secondary text-sm">
            Open cases against other players. Highest total value wins everything.
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create Battle
        </button>
      </div>

      {/* Waiting battles */}
      <div>
        <h2 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Open Battles ({waitingBattles.length})
        </h2>
        {waitingBattles.length === 0 ? (
          <div className="card text-center py-12 text-text-secondary">
            No open battles. Create one to start!
          </div>
        ) : (
          <div className="space-y-3">
            {waitingBattles.map((battle) => (
              <BattleCard
                key={battle.id}
                battle={battle}
                onJoin={() => handleJoinBattle(battle)}
                onView={() => setActiveBattleId(battle.id)}
                userId={state.user?.identity}
              />
            ))}
          </div>
        )}
      </div>

      {/* Active battles */}
      {activeBattles.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            In Progress ({activeBattles.length})
          </h2>
          <div className="space-y-3">
            {activeBattles.map((battle) => (
              <BattleCard
                key={battle.id}
                battle={battle}
                onView={() => setActiveBattleId(battle.id)}
                userId={state.user?.identity}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed battles */}
      {completedBattles.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-text mb-3">
            Completed ({completedBattles.length})
          </h2>
          <div className="space-y-3">
            {completedBattles.map((battle) => (
              <BattleCard
                key={battle.id}
                battle={battle}
                onView={() => setActiveBattleId(battle.id)}
                userId={state.user?.identity}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Battle Card ──

interface BattleCardProps {
  battle: CaseBattle;
  onJoin?: () => void;
  onView?: () => void;
  userId?: string;
}

function BattleCard({ battle, onJoin, onView, userId }: BattleCardProps) {
  const isParticipant = battle.players.some((p) => p.userId === userId);
  const canJoin =
    battle.status === "waiting" && !isParticipant && battle.players.length < battle.maxPlayers;

  return (
    <div className="card-hover flex items-center gap-4 p-4">
      {/* Cases */}
      <div className="flex items-center gap-1 shrink-0">
        {battle.cases.map((cs, i) => (
          <div
            key={`${cs.id}-${i}`}
            className="w-10 h-10 rounded-lg bg-bg border border-border flex items-center justify-center text-lg"
            title={cs.name}
          >
            {"\u{1F4E6}"}
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-text">
            {battle.cases.map((c) => c.name).join(" + ")}
          </span>
          <span
            className={`
              px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase
              ${battle.status === "waiting" ? "bg-primary/10 text-primary" : ""}
              ${battle.status === "in_progress" ? "bg-success/10 text-success" : ""}
              ${battle.status === "complete" ? "bg-text-secondary/10 text-text-secondary" : ""}
            `}
          >
            {battle.status.replace("_", " ")}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-text-secondary mt-1">
          <span>{battle.players.length}/{battle.maxPlayers} players</span>
          <span>{battle.totalRounds} rounds</span>
          <span className="font-mono text-primary">{formatCredits(battle.costPerPlayer)} per player</span>
        </div>
      </div>

      {/* Players */}
      <div className="flex items-center -space-x-2">
        {battle.players.map((p) => (
          <div
            key={p.userId}
            className="w-8 h-8 rounded-full bg-primary/20 border-2 border-surface flex items-center justify-center text-xs text-primary font-bold"
            title={p.username}
          >
            {p.username.charAt(0).toUpperCase()}
          </div>
        ))}
        {Array.from({ length: battle.maxPlayers - battle.players.length }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="w-8 h-8 rounded-full border-2 border-dashed border-border bg-bg flex items-center justify-center text-xs text-text-secondary"
          >
            ?
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-2">
        {canJoin && onJoin && (
          <button onClick={onJoin} className="btn-primary text-sm px-4 py-2">
            Join
          </button>
        )}
        {onView && (
          <button onClick={onView} className="btn-ghost text-sm px-3 py-2">
            View
          </button>
        )}
      </div>
    </div>
  );
}
