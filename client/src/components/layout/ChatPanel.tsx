import { useState, useRef, useEffect } from "react";
import { useGame } from "../../lib/gameContext";
import { CHAT } from "../../lib/constants";

interface ChatPanelProps {
  onClose: () => void;
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const { state, actions } = useGame();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.chat.messages.length]);

  const handleSend = () => {
    if (!message.trim()) return;
    actions.sendChat(message);
    setMessage("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="font-semibold text-text">Chat</span>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {state.chat.messages.length}
          </span>
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {state.chat.messages.map((msg) => (
          <div key={msg.id} className="animate-fade-in">
            <div className="flex items-start gap-2">
              {/* Avatar */}
              <div
                className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5
                  ${msg.isAdmin ? "bg-gold/20 text-gold" : "bg-primary/20 text-primary"}
                `}
              >
                {msg.username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-sm font-semibold ${
                      msg.isAdmin ? "text-gold" : "text-primary"
                    }`}
                  >
                    {msg.username}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-text break-words">{msg.message}</p>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border shrink-0">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, CHAT.MAX_MESSAGE_LENGTH))}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="input-field flex-1 text-sm py-2"
          />
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="btn-primary px-3 py-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <div className="text-xs text-text-secondary mt-1 text-right">
          {message.length}/{CHAT.MAX_MESSAGE_LENGTH}
        </div>
      </div>
    </div>
  );
}
