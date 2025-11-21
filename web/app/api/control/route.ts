import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);
const PROJECT_DIR = path.join(process.cwd(), '..');
const MESSAGES_DIR = path.join(PROJECT_DIR, 'messages');
const ACTIVE_FILE = path.join(MESSAGES_DIR, 'active_session.json');
const RUNNING_FILE = path.join(MESSAGES_DIR, 'running_session.json');

function getActiveSessionId(): string | null {
  if (fs.existsSync(ACTIVE_FILE)) {
    const data = JSON.parse(fs.readFileSync(ACTIVE_FILE, 'utf-8'));
    return data.sessionId || null;
  }
  return null;
}

// 実行中のセッションを確認
async function getRunningSession(): Promise<string | null> {
  try {
    const { stdout } = await execAsync('tmux list-sessions -F "#{session_name}" 2>/dev/null || true');
    if (stdout.includes('watcher')) {
      // watcherが動いている = セッション実行中
      // running_session.json から実行中のセッションIDを取得
      if (fs.existsSync(RUNNING_FILE)) {
        const data = JSON.parse(fs.readFileSync(RUNNING_FILE, 'utf-8'));
        return data.sessionId || null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET() {
  const runningSessionId = await getRunningSession();
  return NextResponse.json({ runningSessionId });
}

export async function POST(request: Request) {
  try {
    const { action, message } = await request.json();

    switch (action) {
      case 'stop':
        // 全セッション停止
        await execAsync('tmux kill-session -t claude1 2>/dev/null || true');
        await execAsync('tmux kill-session -t claude2 2>/dev/null || true');
        await execAsync('tmux kill-session -t watcher 2>/dev/null || true');
        // 実行中セッション情報をクリア
        if (fs.existsSync(RUNNING_FILE)) {
          fs.unlinkSync(RUNNING_FILE);
        }
        return NextResponse.json({ success: true, message: 'Sessions stopped' });

      case 'start': {
        // アクティブセッションがない場合はエラー
        const sessionId = getActiveSessionId();
        if (!sessionId) {
          return NextResponse.json({ error: 'No active session. Create a session first.' }, { status: 400 });
        }

        // 既存セッション停止
        await execAsync('tmux kill-session -t claude1 2>/dev/null || true');
        await execAsync('tmux kill-session -t claude2 2>/dev/null || true');
        await execAsync('tmux kill-session -t watcher 2>/dev/null || true');

        // watcher起動（セッションIDを環境変数で渡す）
        await execAsync(
          `tmux new-session -d -s watcher "SESSION_ID=${sessionId} bash ${PROJECT_DIR}/scripts/watch_messages.sh"`,
          { cwd: PROJECT_DIR }
        );

        // Claude 1 起動
        await execAsync(`tmux new-session -d -s claude1 -x 200 -y 50`, { cwd: PROJECT_DIR });
        await execAsync(`sleep 0.3`);
        const claude1Cmd = `cd "${PROJECT_DIR}/claude1" && PROMPT=$(cat CLAUDE.md) && claude --dangerously-skip-permissions --model haiku --append-system-prompt "$PROMPT"`;
        await execAsync(`tmux send-keys -t claude1 '${claude1Cmd}' Enter`);

        // Claude 2 起動
        await execAsync(`tmux new-session -d -s claude2 -x 200 -y 50`, { cwd: PROJECT_DIR });
        await execAsync(`sleep 0.3`);
        const claude2Cmd = `cd "${PROJECT_DIR}/claude2" && PROMPT=$(cat CLAUDE.md) && claude --dangerously-skip-permissions --model haiku --append-system-prompt "$PROMPT"`;
        await execAsync(`tmux send-keys -t claude2 '${claude2Cmd}' Enter`);

        return NextResponse.json({ success: true, message: 'Sessions started' });
      }

      case 'send': {
        // メッセージ送信（セッション起動も含む）
        if (!message) {
          return NextResponse.json({ error: 'Message required' }, { status: 400 });
        }

        const sessionId = getActiveSessionId();
        if (!sessionId) {
          return NextResponse.json({ error: 'No active session' }, { status: 400 });
        }

        // ユーザーメッセージをアーカイブに保存
        const sessionDir = path.join(MESSAGES_DIR, 'sessions', sessionId);
        const archiveDir = path.join(sessionDir, 'archive');
        const userMsg = {
          id: `user_${Date.now()}`,
          sender: 'user',
          receiver: 'claude1',
          content: message,
          timestamp: new Date().toISOString(),
          type: 'message'
        };
        fs.writeFileSync(
          path.join(archiveDir, `user_${Date.now()}.json`),
          JSON.stringify(userMsg, null, 2)
        );

        // 既存セッション停止
        await execAsync('tmux kill-session -t claude1 2>/dev/null || true');
        await execAsync('tmux kill-session -t claude2 2>/dev/null || true');
        await execAsync('tmux kill-session -t watcher 2>/dev/null || true');

        // 実行中セッションを記録
        fs.writeFileSync(RUNNING_FILE, JSON.stringify({ sessionId }, null, 2));

        // watcher起動
        await execAsync(
          `tmux new-session -d -s watcher "SESSION_ID=${sessionId} bash ${PROJECT_DIR}/scripts/watch_messages.sh"`,
          { cwd: PROJECT_DIR }
        );

        // Claude 1 起動
        await execAsync(`tmux new-session -d -s claude1 -x 200 -y 50`, { cwd: PROJECT_DIR });
        await execAsync(`sleep 0.3`);
        const claude1Cmd = `cd "${PROJECT_DIR}/claude1" && PROMPT=$(cat CLAUDE.md) && claude --dangerously-skip-permissions --model haiku --append-system-prompt "$PROMPT"`;
        await execAsync(`tmux send-keys -t claude1 '${claude1Cmd}' Enter`);

        // Claude 2 起動
        await execAsync(`tmux new-session -d -s claude2 -x 200 -y 50`, { cwd: PROJECT_DIR });
        await execAsync(`sleep 0.3`);
        const claude2Cmd = `cd "${PROJECT_DIR}/claude2" && PROMPT=$(cat CLAUDE.md) && claude --dangerously-skip-permissions --model haiku --append-system-prompt "$PROMPT"`;
        await execAsync(`tmux send-keys -t claude2 '${claude2Cmd}' Enter`);

        // Claude起動待ち
        await execAsync(`sleep 3`);

        // プロンプトを構築：ユーザの入力 + 会話開始の指示
        const prompt = `${message}\n\nこれをテーマとして、claude2と会話を開始してください。`;
        const escapedMessage = prompt.replace(/'/g, "'\\''");
        await execAsync(`tmux send-keys -t claude1 -l '${escapedMessage}'`);
        await execAsync(`tmux send-keys -t claude1 Enter`);
        return NextResponse.json({ success: true, message: 'Message sent' });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Control error:', error);
    return NextResponse.json({ error: 'Failed to execute action' }, { status: 500 });
  }
}
