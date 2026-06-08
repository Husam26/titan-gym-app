import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { sendChatMessage } from '../services/ai';
import { Send, Bot, Trash2, Loader2 } from 'lucide-react';

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export const Chat: React.FC = () => {
  const chatHistory = useStore((s) => s.chatHistory);
  const isGenerating = useStore((s) => s.isGenerating);
  const addChatMessage = useStore((s) => s.addChatMessage);
  const clearChat = useStore((s) => s.clearChat);
  const setIsGenerating = useStore((s) => s.setIsGenerating);

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isGenerating, scrollToBottom]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isGenerating) return;

    setInput('');
    inputRef.current?.focus();

    // 1. Add user message
    addChatMessage('user', text);

    // 2. Start generating
    setIsGenerating(true);

    try {
      // 3. Call AI
      const response = await sendChatMessage(text);

      // 4. Add AI response
      addChatMessage('assistant', response);
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Something went wrong. Try again.';
      addChatMessage('assistant', `⚠️ ${errorMsg}`);
    } finally {
      // 5. Done
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    if (chatHistory.length === 0) return;
    clearChat();
  };

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* ── Header ───────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-3 glass border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white leading-tight">JEERA AI Coach</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400">Online</span>
            </div>
          </div>
        </div>
        <button
          onClick={handleClear}
          disabled={chatHistory.length === 0}
          className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Clear chat"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </header>

      {/* ── Messages Area ────────────────────────────────────── */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {/* Empty state */}
        {chatHistory.length === 0 && !isGenerating && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">Hey! I'm JEERA 💪</h2>
            <p className="text-sm text-zinc-500 max-w-[260px]">
              Your AI gym trainer. Ask me anything about workouts, form, nutrition, or your progress.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {[
                'How\'s my progress?',
                'Tips for chest day',
                'Am I overtraining?',
                'Nutrition advice',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q);
                    inputRef.current?.focus();
                  }}
                  className="px-3 py-1.5 text-xs rounded-full border border-white/10 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat messages */}
        {chatHistory.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
          >
            <div
              className={`max-w-[85%] px-4 py-2.5 ${
                msg.role === 'user' ? 'chat-user' : 'chat-ai'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              <p
                className={`text-[10px] mt-1 ${
                  msg.role === 'user' ? 'text-white/60 text-right' : 'text-zinc-500'
                }`}
              >
                {formatTime(msg.timestamp)}
              </p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isGenerating && (
          <div className="flex justify-start animate-slide-up">
            <div className="chat-ai px-4 py-3">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Bar ────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-3 pb-3 pt-2 glass border-t border-white/5 safe-bottom">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your AI trainer..."
            disabled={isGenerating}
            className="flex-1 bg-bg-elevated rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 border border-white/5 focus:border-emerald-500/40 focus:outline-none transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isGenerating}
            className="w-11 h-11 flex-shrink-0 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            aria-label="Send message"
          >
            {isGenerating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
