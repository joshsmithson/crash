import { useState } from "react";
import { useGame } from "../../lib/gameContext";
import { CaseEditor } from "./CaseEditor";
import { UserManager } from "./UserManager";
import { formatCredits } from "../../lib/formatCredits";

type AdminTab = "overview" | "users" | "cases";

export function AdminDashboard() {
  const { state } = useGame();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  if (!state.user?.isAdmin) {
    return (
      <div className="card text-center py-16">
        <div className="text-4xl mb-4">{"\u{1F6AB}"}</div>
        <h2 className="text-xl font-bold text-text mb-2">Access Denied</h2>
        <p className="text-text-secondary">
          You do not have permission to access the admin panel.
        </p>
      </div>
    );
  }

  const tabs: { id: AdminTab; label: string; icon: JSX.Element }[] = [
    {
      id: "overview",
      label: "Overview",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      id: "users",
      label: "Users",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      id: "cases",
      label: "Case Editor",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          <svg className="w-6 h-6 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Admin Dashboard
        </h1>
        <p className="text-text-secondary text-sm">Manage the platform</p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 p-1 bg-surface rounded-xl border border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all
              ${
                activeTab === tab.id
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-text-secondary hover:text-text hover:bg-surface-hover"
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && <AdminOverview />}
      {activeTab === "users" && <UserManager />}
      {activeTab === "cases" && <CaseEditor />}
    </div>
  );
}

function AdminOverview() {
  const stats = [
    { label: "Total Users", value: "12,847", change: "+142 today", positive: true },
    { label: "Active Users (24h)", value: "1,247", change: "+8.3%", positive: true },
    { label: "Total Wagered", value: formatCredits(240_567_890_00), change: "+$12.4K", positive: true },
    { label: "House Profit", value: formatCredits(9_622_715_00), change: "4.0% edge", positive: true },
    { label: "Open Coin Flips", value: "23", change: "", positive: true },
    { label: "Active Battles", value: "5", change: "", positive: true },
    { label: "Total Cases Opened", value: "84,512", change: "+2,341 today", positive: true },
    { label: "Crash Rounds Today", value: "1,847", change: "", positive: true },
  ];

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card">
            <div className="text-xs text-text-secondary font-medium uppercase tracking-wide">
              {stat.label}
            </div>
            <div className="text-2xl font-mono font-bold text-text mt-1">
              {stat.value}
            </div>
            {stat.change && (
              <div
                className={`text-xs mt-1 ${stat.positive ? "text-success" : "text-danger"}`}
              >
                {stat.change}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="card">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Force Crash", icon: "\u{1F680}", color: "text-danger" },
            { label: "Pause Betting", icon: "\u{23F8}\u{FE0F}", color: "text-gold" },
            { label: "Send Announcement", icon: "\u{1F4E2}", color: "text-primary" },
            { label: "Export Data", icon: "\u{1F4CA}", color: "text-success" },
          ].map((action) => (
            <button
              key={action.label}
              className="card-hover text-center py-4 flex flex-col items-center gap-2"
            >
              <span className="text-2xl">{action.icon}</span>
              <span className={`text-xs font-medium ${action.color}`}>
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="card">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">
          Recent Activity
        </h3>
        <div className="space-y-2">
          {[
            { text: "User Ace won 8,500.00 from Danger Zone case", time: "2m ago", type: "win" },
            { text: "Crash round #1847 crashed at 1.02x", time: "5m ago", type: "crash" },
            { text: "New user registered: NightOwl", time: "8m ago", type: "user" },
            { text: "Case Battle completed. StormX won 15,420.00", time: "12m ago", type: "win" },
            { text: "Roulette green hit! 3 players won 14x", time: "15m ago", type: "win" },
          ].map((activity, i) => (
            <div
              key={i}
              className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-surface-hover transition-colors"
            >
              <div
                className={`w-2 h-2 rounded-full shrink-0 ${
                  activity.type === "win"
                    ? "bg-success"
                    : activity.type === "crash"
                    ? "bg-danger"
                    : "bg-primary"
                }`}
              />
              <span className="text-sm text-text flex-1">{activity.text}</span>
              <span className="text-xs text-text-secondary shrink-0">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
