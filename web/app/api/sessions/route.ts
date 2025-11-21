import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const MESSAGES_DIR = path.join(process.cwd(), '..', 'messages');
const SESSIONS_DIR = path.join(MESSAGES_DIR, 'sessions');
const ACTIVE_FILE = path.join(MESSAGES_DIR, 'active_session.json');

interface Message {
  id: string;
  sender: string;
  receiver: string;
  content: string;
  timestamp: string;
}

function getActiveSessionId(): string | null {
  if (fs.existsSync(ACTIVE_FILE)) {
    const data = JSON.parse(fs.readFileSync(ACTIVE_FILE, 'utf-8'));
    return data.sessionId || null;
  }
  return null;
}

function readMessagesFromSession(sessionId: string): Message[] {
  const archiveDir = path.join(SESSIONS_DIR, sessionId, 'archive');
  if (!fs.existsSync(archiveDir)) return [];

  const files = fs.readdirSync(archiveDir).filter(f => f.endsWith('.json'));
  const messages: Message[] = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(archiveDir, file), 'utf-8');
      messages.push(JSON.parse(content));
    } catch {
      // skip
    }
  }

  // Sort by message ID instead of timestamp
  messages.sort((a, b) => {
    const aNum = parseInt(a.id?.replace('msg_', '') || '0', 10);
    const bNum = parseInt(b.id?.replace('msg_', '') || '0', 10);
    return aNum - bNum;
  });
  return messages;
}

// セッション一覧取得
export async function GET() {
  try {
    if (!fs.existsSync(SESSIONS_DIR)) {
      fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    }

    const dirs = fs.readdirSync(SESSIONS_DIR).filter(d => {
      const stat = fs.statSync(path.join(SESSIONS_DIR, d));
      return stat.isDirectory();
    });

    const sessions = dirs.map(dir => {
      const metaPath = path.join(SESSIONS_DIR, dir, 'meta.json');
      if (fs.existsSync(metaPath)) {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        const messages = readMessagesFromSession(dir);
        return { ...meta, messageCount: messages.length };
      }
      return null;
    }).filter(Boolean);

    sessions.sort((a, b) => new Date(b!.createdAt).getTime() - new Date(a!.createdAt).getTime());

    const activeSessionId = getActiveSessionId();

    return NextResponse.json({ sessions, activeSessionId });
  } catch {
    return NextResponse.json({ error: 'Failed to get sessions' }, { status: 500 });
  }
}

// 新規セッション作成
export async function POST(request: Request) {
  try {
    const { name } = await request.json();

    const sessionId = `session_${Date.now()}`;
    const sessionDir = path.join(SESSIONS_DIR, sessionId);

    // ディレクトリ作成
    fs.mkdirSync(path.join(sessionDir, 'archive'), { recursive: true });
    fs.mkdirSync(path.join(sessionDir, 'c1_to_c2'), { recursive: true });
    fs.mkdirSync(path.join(sessionDir, 'c2_to_c1'), { recursive: true });

    // メタデータ作成
    const meta = {
      id: sessionId,
      name: name || `Session ${new Date().toLocaleString('ja-JP')}`,
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(sessionDir, 'meta.json'), JSON.stringify(meta, null, 2));

    // state.json作成
    const state = {
      current_turn: 'claude1',
      last_message_id: null,
      message_counter: 0,
      pending_reply_to: null,
    };
    fs.writeFileSync(path.join(sessionDir, 'state.json'), JSON.stringify(state, null, 2));

    // アクティブセッションに設定
    fs.writeFileSync(ACTIVE_FILE, JSON.stringify({ sessionId }, null, 2));

    return NextResponse.json({ success: true, session: meta });
  } catch {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}
