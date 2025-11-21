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
  reply_to?: string | null;
}

function getActiveSessionId(): string | null {
  if (fs.existsSync(ACTIVE_FILE)) {
    const data = JSON.parse(fs.readFileSync(ACTIVE_FILE, 'utf-8'));
    return data.sessionId || null;
  }
  return null;
}

function readMessagesFromDir(dirPath: string): Message[] {
  if (!fs.existsSync(dirPath)) return [];

  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
  const messages: Message[] = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(dirPath, file), 'utf-8');
      messages.push(JSON.parse(content));
    } catch {
      // skip invalid files
    }
  }

  return messages;
}

export async function GET() {
  try {
    const activeSessionId = getActiveSessionId();

    if (!activeSessionId) {
      return NextResponse.json({ messages: [], state: null, activeSessionId: null });
    }

    const sessionDir = path.join(SESSIONS_DIR, activeSessionId);
    const archiveDir = path.join(sessionDir, 'archive');
    const statePath = path.join(sessionDir, 'state.json');

    const messages = readMessagesFromDir(archiveDir);
    // Sort: user messages first (by timestamp), then msg_0001, msg_0002, etc.
    messages.sort((a, b) => {
      const aIsUser = a.id?.startsWith('user_');
      const bIsUser = b.id?.startsWith('user_');
      if (aIsUser && !bIsUser) return -1;
      if (!aIsUser && bIsUser) return 1;
      if (aIsUser && bIsUser) {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }
      const aNum = parseInt(a.id?.replace('msg_', '') || '0', 10);
      const bNum = parseInt(b.id?.replace('msg_', '') || '0', 10);
      return aNum - bNum;
    });

    let state = null;
    if (fs.existsSync(statePath)) {
      state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    }

    return NextResponse.json({ messages, state, activeSessionId });
  } catch {
    return NextResponse.json({ error: 'Failed to read messages' }, { status: 500 });
  }
}
