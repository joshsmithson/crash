import { useState } from "react";
import { formatCredits, parseCredits } from "../../lib/formatCredits";
import { UserAvatar } from "../shared/UserAvatar";

interface MockUser {
  id: string;
  username: string;
  balance: number;
  level: number;
  isAdmin: boolean;
  isBanned: boolean;
  totalWagered: number;
  totalProfit: number;
  joinedAt: number;
  lastSeen: number;
}

const MOCK_USERS: MockUser[] = [
  {
    id: "u1",
    username: "Player1",
    balance: 100_000_00,
    level: 42,
    isAdmin: true,
    isBanned: false,
    totalWagered: 5_000_000_00,
    totalProfit: 250_000_00,
    joinedAt: Date.now() - 86400000 * 90,
    lastSeen: Date.now() - 60000,
  },
  {
    id: "u2",
    username: "Ace",
    balance: 45_000_00,
    level: 28,
    isAdmin: false,
    isBanned: false,
    totalWagered: 2_300_000_00,
    totalProfit: -120_000_00,
    joinedAt: Date.now() - 86400000 * 60,
    lastSeen: Date.now() - 300000,
  },
  {
    id: "u3",
    username: "Blaze",
    balance: 12_500_00,
    level: 15,
    isAdmin: false,
    isBanned: false,
    totalWagered: 800_000_00,
    totalProfit: 50_000_00,
    joinedAt: Date.now() - 86400000 * 30,
    lastSeen: Date.now() - 3600000,
  },
  {
    id: "u4",
    username: "Cipher",
    balance: 0,
    level: 8,
    isAdmin: false,
    isBanned: true,
    totalWagered: 150_000_00,
    totalProfit: -150_000_00,
    joinedAt: Date.now() - 86400000 * 15,
    lastSeen: Date.now() - 86400000 * 3,
  },
  {
    id: "u5",
    username: "Dex",
    balance: 78_900_00,
    level: 35,
    isAdmin: false,
    isBanned: false,
    totalWagered: 3_400_000_00,
    totalProfit: 180_000_00,
    joinedAt: Date.now() - 86400000 * 75,
    lastSeen: Date.now() - 120000,
  },
];

export function UserManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<MockUser | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [users, setUsers] = useState(MOCK_USERS);

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.includes(searchQuery),
  );

  const handleGrantCredits = (userId: string) => {
    const amount = parseCredits(creditAmount);
    if (amount <= 0) return;
    setUsers(
      users.map((u) =>
        u.id === userId ? { ...u, balance: u.balance + amount } : u,
      ),
    );
    if (selectedUser?.id === userId) {
      setSelectedUser({ ...selectedUser, balance: selectedUser.balance + amount });
    }
    setCreditAmount("");
  };

  const handleDeductCredits = (userId: string) => {
    const amount = parseCredits(creditAmount);
    if (amount <= 0) return;
    setUsers(
      users.map((u) =>
        u.id === userId ? { ...u, balance: Math.max(0, u.balance - amount) } : u,
      ),
    );
    if (selectedUser?.id === userId) {
      setSelectedUser({
        ...selectedUser,
        balance: Math.max(0, selectedUser.balance - amount),
      });
    }
    setCreditAmount("");
  };

  const handleToggleBan = (userId: string) => {
    setUsers(
      users.map((u) =>
        u.id === userId ? { ...u, isBanned: !u.isBanned } : u,
      ),
    );
    if (selectedUser?.id === userId) {
      setSelectedUser({ ...selectedUser, isBanned: !selectedUser.isBanned });
    }
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTimeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="card">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username or ID..."
            className="input-field w-full pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* User list */}
        <div className="lg:col-span-2 card">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
            Users ({filteredUsers.length})
          </h3>
          <div className="space-y-1">
            {filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className={`
                  w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left
                  ${
                    selectedUser?.id === user.id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-surface-hover border border-transparent"
                  }
                `}
              >
                <UserAvatar
                  username={user.username}
                  level={user.level}
                  isAdmin={user.isAdmin}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text text-sm">{user.username}</span>
                    {user.isBanned && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-danger/10 text-danger font-semibold">
                        BANNED
                      </span>
                    )}
                    {user.isAdmin && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-gold/10 text-gold font-semibold">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-text-secondary">
                    Balance: {formatCredits(user.balance)} &middot; Last seen: {formatTimeAgo(user.lastSeen)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className={`text-xs font-mono ${
                      user.totalProfit >= 0 ? "text-success" : "text-danger"
                    }`}
                  >
                    {user.totalProfit >= 0 ? "+" : ""}
                    {formatCredits(user.totalProfit)}
                  </div>
                </div>
              </button>
            ))}
            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-text-secondary text-sm">
                No users found
              </div>
            )}
          </div>
        </div>

        {/* User detail */}
        <div className="lg:col-span-1">
          {selectedUser ? (
            <div className="card space-y-4 sticky top-4">
              {/* User info */}
              <div className="text-center">
                <UserAvatar
                  username={selectedUser.username}
                  level={selectedUser.level}
                  isAdmin={selectedUser.isAdmin}
                  size="lg"
                  className="mx-auto mb-3"
                />
                <h3 className="text-lg font-bold text-text">{selectedUser.username}</h3>
                <p className="text-xs text-text-secondary">ID: {selectedUser.id}</p>
                {selectedUser.isBanned && (
                  <div className="mt-2 px-3 py-1 bg-danger/10 text-danger text-xs rounded-full inline-block font-semibold">
                    Account Banned
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-text-secondary">Balance</span>
                  <span className="font-mono font-bold text-primary">
                    {formatCredits(selectedUser.balance)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-text-secondary">Level</span>
                  <span className="text-text">{selectedUser.level}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-text-secondary">Total Wagered</span>
                  <span className="font-mono text-text">
                    {formatCredits(selectedUser.totalWagered)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-text-secondary">Total Profit</span>
                  <span
                    className={`font-mono ${
                      selectedUser.totalProfit >= 0 ? "text-success" : "text-danger"
                    }`}
                  >
                    {selectedUser.totalProfit >= 0 ? "+" : ""}
                    {formatCredits(selectedUser.totalProfit)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-text-secondary">Joined</span>
                  <span className="text-text">{formatDate(selectedUser.joinedAt)}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-text-secondary">Last Seen</span>
                  <span className="text-text">{formatTimeAgo(selectedUser.lastSeen)}</span>
                </div>
              </div>

              {/* Credit management */}
              <div className="space-y-2 pt-3 border-t border-border">
                <label className="text-xs text-text-secondary font-medium uppercase tracking-wide">
                  Manage Credits
                </label>
                <input
                  type="text"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  placeholder="Amount (e.g., 100.00)"
                  className="input-field w-full text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleGrantCredits(selectedUser.id)}
                    disabled={!creditAmount}
                    className="btn-success text-sm py-2"
                  >
                    Grant
                  </button>
                  <button
                    onClick={() => handleDeductCredits(selectedUser.id)}
                    disabled={!creditAmount}
                    className="btn-danger text-sm py-2"
                  >
                    Deduct
                  </button>
                </div>
              </div>

              {/* Ban toggle */}
              <button
                onClick={() => handleToggleBan(selectedUser.id)}
                className={`
                  w-full py-2.5 rounded-lg text-sm font-semibold transition-colors
                  ${
                    selectedUser.isBanned
                      ? "bg-success/10 text-success border border-success/20 hover:bg-success/20"
                      : "bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20"
                  }
                `}
              >
                {selectedUser.isBanned ? "Unban User" : "Ban User"}
              </button>
            </div>
          ) : (
            <div className="card text-center py-16 text-text-secondary">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <p className="text-sm">Select a user to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
