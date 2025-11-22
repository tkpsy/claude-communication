'use client';

import { useEffect, useState, useRef } from 'react';

interface Message {
  id: string;
  sender: string;
  receiver: string;
  content: string;
  timestamp: string;
  reply_to?: string | null;
}

interface Session {
  id: string;
  name: string;
  createdAt: string;
  messages: Message[];
}

interface State {
  current_turn: string;
  last_message_id: string;
  message_counter: number;
  pending_reply_to: string;
}

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [runningSessionId, setRunningSessionId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [state, setState] = useState<State | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();
      setSessions(data.sessions || []);
      setActiveSessionId(data.activeSessionId || null);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  };

  const fetchCurrentMessages = async () => {
    try {
      const [messagesRes, controlRes] = await Promise.all([
        fetch('/api/messages'),
        fetch('/api/control')
      ]);
      const messagesData = await messagesRes.json();
      const controlData = await controlRes.json();

      setCurrentMessages(messagesData.messages || []);
      setState(messagesData.state);
      setActiveSessionId(messagesData.activeSessionId || null);
      setRunningSessionId(controlData.runningSessionId || null);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const fetchSessionMessages = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const data = await res.json();
      return data.session?.messages || [];
    } catch (err) {
      console.error('Failed to fetch session:', err);
      return [];
    }
  };

  useEffect(() => {
    // 初回ロード
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchSessions();
    void fetchCurrentMessages();
  }, []);

  useEffect(() => {
    // ポーリング
    const interval = setInterval(() => {
      void fetchCurrentMessages();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // メッセージが更新されたら自動スクロール（autoScrollがONの場合のみ）
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentMessages, autoScroll]);

  const handleControl = async (action: string, message?: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, message }),
      });
      const data = await res.json();
      if (data.success) {
        // 状態を更新
        setTimeout(() => {
          fetchCurrentMessages();
          fetchSessions();
        }, 1000);
      }
    } catch (err) {
      console.error('Control error:', err);
    }
    setLoading(false);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    await handleControl('send', inputMessage);
    setInputMessage('');
  };

  const handleCreateSession = async () => {
    const name = prompt('新しいセッション名を入力:');
    if (!name) return;

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        fetchSessions();
        fetchCurrentMessages();
        setSelectedSessionId(null);
      }
    } catch (err) {
      console.error('Create session error:', err);
    }
  };

  const handleActivateSession = async (sessionId: string) => {
    try {
      await fetch(`/api/sessions/${sessionId}`, { method: 'PUT' });
      setActiveSessionId(sessionId);
      setSelectedSessionId(null);
      fetchCurrentMessages();
      fetchSessions();
    } catch (err) {
      console.error('Activate session error:', err);
    }
  };

  const handleSelectSession = async (sessionId: string | null) => {
    setSelectedSessionId(sessionId);
    if (sessionId) {
      const messages = await fetchSessionMessages(sessionId);
      setCurrentMessages(messages);
    } else {
      fetchCurrentMessages();
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('このセッションを削除しますか？')) return;

    try {
      await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
      fetchSessions();
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
        fetchCurrentMessages();
      }
    } catch (err) {
      console.error('Delete session error:', err);
    }
  };

  const displayMessages = currentMessages;

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-72 bg-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-lg font-bold">Claude Monitor</h1>
          <p className="text-xs text-gray-500 mt-1">AI同士の会話を監視</p>
        </div>

        {/* Running Session Info */}
        <div className="p-2 border-b border-gray-700">
          {runningSessionId ? (
            <div className="px-3 py-2 bg-green-900/50 rounded flex items-center gap-2 ring-1 ring-green-500">
              <span className="text-lg">🟢</span>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate text-green-400">
                  {sessions.find(s => s.id === runningSessionId)?.name || 'Running'}
                </div>
                <div className="text-xs text-green-300">
                  実行中
                </div>
              </div>
            </div>
          ) : (
            <div className="px-3 py-2 text-gray-500 text-sm bg-gray-800 rounded">
              実行中のセッションなし
            </div>
          )}
        </div>

        {/* All Sessions */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="text-xs text-gray-500 px-3 py-2 uppercase font-semibold">セッション一覧</div>
          {sessions.length === 0 ? (
            <div className="text-xs text-gray-600 px-3 py-2">セッションなし</div>
          ) : (
            sessions.map((session) => {
              const isRunning = runningSessionId === session.id;
              const isActive = activeSessionId === session.id;
              return (
                <div
                  key={session.id}
                  onClick={() => handleActivateSession(session.id)}
                  className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer mb-1 ${
                    isRunning ? 'bg-green-700 ring-2 ring-green-400' : isActive ? 'bg-gray-600 ring-1 ring-gray-400' : 'hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">{isRunning ? '🟢' : '⚪'}</span>
                    <div className="truncate">
                      <div className="text-sm truncate">{session.name}</div>
                      <div className="text-xs text-gray-400">
                        {isRunning && '実行中 · '}
                        {(session as Session & { messageCount?: number }).messageCount || 0} messages
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(session.id, e)}
                    className="text-gray-500 hover:text-red-400 ml-2"
                    disabled={isRunning}
                  >
                    x
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Actions */}
        <div className="p-3 border-t border-gray-700 space-y-2">
          <button
            onClick={handleCreateSession}
            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
          >
            ➕ 新しいセッションを作成
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header / Control Panel */}
        <div className="p-4 bg-gray-800 border-b border-gray-700">
          {selectedSessionId ? (
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">
                  {sessions.find(s => s.id === selectedSessionId)?.name || 'Session'}
                </h2>
                <p className="text-xs text-gray-500">保存済みセッション（閲覧のみ）</p>
              </div>
              <button
                onClick={() => handleSelectSession(null)}
                className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded"
              >
                現在の会話に戻る
              </button>
            </div>
          ) : activeSessionId ? (
            <>
              {runningSessionId && runningSessionId !== activeSessionId ? (
                <div className="p-3 bg-yellow-900/50 rounded text-yellow-300 text-sm">
                  ⚠️ 別のセッション「{sessions.find(s => s.id === runningSessionId)?.name}」が実行中です。
                  先に停止してください。
                </div>
              ) : runningSessionId === activeSessionId ? (
                <div className="flex items-center justify-between">
                  <div className="text-green-400">
                    🟢 会話実行中
                  </div>
                  <button
                    onClick={() => handleControl('stop')}
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm disabled:opacity-50"
                  >
                    ⏹️ 停止
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !loading && handleSendMessage()}
                      placeholder="会話のテーマを入力..."
                      className="flex-1 px-4 py-2 bg-gray-700 rounded text-white placeholder-gray-400 text-sm"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={loading || !inputMessage.trim()}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm disabled:opacity-50"
                    >
                      {loading ? '起動中...' : '▶️ 会話開始'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    💡 テーマを入力して「会話開始」を押すと、Claude同士の会話が始まります
                  </p>
                </>
              )}
            </>
          ) : (
            <div className="text-gray-500">
              <p>左側のサイドバーから「新しいセッションを作成」してください</p>
            </div>
          )}
        </div>

        {/* Status Bar */}
        {state && !selectedSessionId && (
          <div className="px-4 py-2 text-sm text-gray-400 bg-gray-850 border-b border-gray-700 flex gap-4 justify-between items-center">
            <div className="flex gap-4">
              <span>
                ターン: <span className="text-yellow-400 font-medium">{state.current_turn}</span>
              </span>
              <span>
                メッセージ数: <span className="text-white">{state.message_counter}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">自動スクロール</span>
              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                  autoScroll ? 'bg-green-600 focus:ring-green-500' : 'bg-gray-600 focus:ring-gray-500'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    autoScroll ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-xs font-medium ${autoScroll ? 'text-green-400' : 'text-gray-500'}`}>
                {autoScroll ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {displayMessages.length === 0 ? (
            <div className="text-gray-500 text-center py-12">
              <div className="text-4xl mb-4">💬</div>
              {selectedSessionId
                ? 'このセッションにはメッセージがありません'
                : '会話を開始してください'}
            </div>
          ) : (
            displayMessages.map((msg) => (
              <div
                key={msg.id}
                className={`p-4 rounded-lg ${
                  msg.sender === 'user'
                    ? 'bg-purple-900/50 border-l-4 border-purple-500'
                    : msg.sender === 'claude1'
                    ? 'bg-blue-900/50 border-l-4 border-blue-500'
                    : 'bg-green-900/50 border-l-4 border-green-500'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-semibold ${
                    msg.sender === 'user' ? 'text-purple-400' : msg.sender === 'claude1' ? 'text-blue-400' : 'text-green-400'
                  }`}>
                    {msg.sender === 'user' ? '👤 User' : msg.sender === 'claude1' ? '🔵 Claude 1' : '🟢 Claude 2'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {msg.id} | {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.reply_to && (
                  <div className="mt-2 text-xs text-gray-500">
                    ↩️ Reply to: {msg.reply_to}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}
