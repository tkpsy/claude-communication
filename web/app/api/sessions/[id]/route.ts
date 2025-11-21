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

// セッション詳細取得
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionDir = path.join(SESSIONS_DIR, id);
    const metaPath = path.join(sessionDir, 'meta.json');
    const statePath = path.join(sessionDir, 'state.json');

    if (!fs.existsSync(metaPath)) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    const state = fs.existsSync(statePath)
      ? JSON.parse(fs.readFileSync(statePath, 'utf-8'))
      : null;
    const messages = readMessagesFromSession(id);

    return NextResponse.json({ session: { ...meta, messages, state } });
  } catch {
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 });
  }
}

// セッションをアクティブに設定
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionDir = path.join(SESSIONS_DIR, id);

    if (!fs.existsSync(sessionDir)) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    fs.writeFileSync(ACTIVE_FILE, JSON.stringify({ sessionId: id }, null, 2));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to activate session' }, { status: 500 });
  }
}

// セッション削除
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionDir = path.join(SESSIONS_DIR, id);

    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true });
    }

    // アクティブセッションだった場合はクリア
    if (fs.existsSync(ACTIVE_FILE)) {
      const data = JSON.parse(fs.readFileSync(ACTIVE_FILE, 'utf-8'));
      if (data.sessionId === id) {
        fs.unlinkSync(ACTIVE_FILE);
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
