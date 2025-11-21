#!/bin/bash
set -e

# 絶対パスを取得
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="$PROJECT_DIR/config.json"

# jqで設定を読み込む
MESSAGE_DIR=$(jq -r '.message_dir' "$CONFIG_FILE")
if [[ ! "$MESSAGE_DIR" = /* ]]; then
  MESSAGE_DIR="$PROJECT_DIR/$MESSAGE_DIR"
fi
C1_TO_C2=$(jq -r '.c1_to_c2' "$CONFIG_FILE")
C2_TO_C1=$(jq -r '.c2_to_c1' "$CONFIG_FILE")

echo "[Setup] Creating message directories..."
mkdir -p "$MESSAGE_DIR/$C1_TO_C2"
mkdir -p "$MESSAGE_DIR/$C2_TO_C1"
mkdir -p "$MESSAGE_DIR/archive"

echo "[Setup] Clearing archive..."
rm -f "$MESSAGE_DIR/archive"/*.json 2>/dev/null || true

echo "[Setup] Initializing turn state..."
cat > "$MESSAGE_DIR/state.json" << 'STATEEOF'
{
  "current_turn": "claude1",
  "last_message_id": null,
  "message_counter": 0,
  "pending_reply_to": null
}
STATEEOF

echo "[Setup] Killing existing sessions..."
tmux kill-session -t claude1 2>/dev/null || true
tmux kill-session -t claude2 2>/dev/null || true
tmux kill-session -t watcher 2>/dev/null || true

echo "[Setup] Starting message watcher (background)..."
tmux new-session -d -s watcher "bash $SCRIPT_DIR/watch_messages.sh"

echo "[Setup] Starting Claude 1 session..."
tmux new-session -d -s claude1 -x 200 -y 50
sleep 0.5
cat > /tmp/claude1_start.sh << EOF
cd "$PROJECT_DIR/claude1"
PROMPT=\$(cat CLAUDE.md)
claude --dangerously-skip-permissions --model haiku --append-system-prompt "\$PROMPT"
EOF
tmux send-keys -t claude1 "bash /tmp/claude1_start.sh" C-m

echo "[Setup] Starting Claude 2 session..."
tmux new-session -d -s claude2 -x 200 -y 50
sleep 0.5
cat > /tmp/claude2_start.sh << EOF
cd "$PROJECT_DIR/claude2"
PROMPT=\$(cat CLAUDE.md)
claude --dangerously-skip-permissions --model haiku --append-system-prompt "\$PROMPT"
EOF
tmux send-keys -t claude2 "bash /tmp/claude2_start.sh" C-m

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
echo "セッション一覧:"
tmux list-sessions
echo ""
