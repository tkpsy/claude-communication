#!/bin/bash
set -e

SCRIPT_DIR="$(dirname "$0")"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="$PROJECT_DIR/config.json"

# jqで設定を読み込む
MESSAGE_DIR=$(jq -r '.message_dir' "$CONFIG_FILE")
C1_TO_C2=$(jq -r '.c1_to_c2' "$CONFIG_FILE")
C2_TO_C1=$(jq -r '.c2_to_c1' "$CONFIG_FILE")

echo "[Setup] Creating message directories..."
mkdir -p "$MESSAGE_DIR/$C1_TO_C2"
mkdir -p "$MESSAGE_DIR/$C2_TO_C1"

echo "[Setup] Killing existing sessions..."
tmux kill-session -t claude1 2>/dev/null || true
tmux kill-session -t claude2 2>/dev/null || true
tmux kill-session -t watcher 2>/dev/null || true

echo "[Setup] Starting message watcher (background)..."
tmux new-session -d -s watcher "bash $SCRIPT_DIR/watch_messages.sh"

echo "[Setup] Starting Claude 1 session..."
tmux new-session -d -s claude1 -x 200 -y 50
sleep 0.5
tmux send-keys -t claude1 "cd \"$PROJECT_DIR/claude1\" && PROMPT=\"\$(cat CLAUDE.md)\" && claude --dangerously-skip-permissions --model haiku --append-system-prompt \"\$PROMPT\"" C-m

echo "[Setup] Starting Claude 2 session..."
tmux new-session -d -s claude2 -x 200 -y 50
sleep 0.5
tmux send-keys -t claude2 "cd \"$PROJECT_DIR/claude2\" && PROMPT=\"\$(cat CLAUDE.md)\" && claude --dangerously-skip-permissions --model haiku --append-system-prompt \"\$PROMPT\"" C-m

echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "3つのセッションが起動されました："
echo ""
echo "1️⃣  Claude 1 に接続:"
echo "   tmux attach-session -t claude1"
echo ""
echo "2️⃣  Claude 2 に接続:"
echo "   tmux attach-session -t claude2"
echo ""
echo "3️⃣  ウォッチャーログ確認:"
echo "   tmux attach-session -t watcher"
echo ""
echo "💬 メッセージ送信方法:"
echo "   Claude から以下を出力すると、他のClaudeに自動送信されます："
echo "   [SEND_TO_CLAUDE2]メッセージ内容"
echo "   [SEND_TO_CLAUDE1]メッセージ内容"
echo ""
echo "セッション一覧:"
tmux list-sessions
echo ""
