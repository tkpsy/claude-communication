#!/bin/bash

# アイデア評価システム起動スクリプト

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== アイデア評価システム起動 ==="

# 既存のセッションを停止
echo "[Cleanup] 既存のセッションを停止..."
tmux kill-session -t proposer 2>/dev/null || true
tmux kill-session -t reviewer 2>/dev/null || true
tmux kill-session -t idea-watcher 2>/dev/null || true

sleep 1

# Proposer AI 起動
echo "[Starting] Proposer AI を起動中..."
tmux new-session -d -s proposer -x 200 -y 50
sleep 0.3
cd_cmd="cd \"$PROJECT_DIR/proposer\""
claude_cmd="PROMPT=\$(cat CLAUDE.md) && claude --dangerously-skip-permissions --model sonnet --append-system-prompt \"\$PROMPT\""
tmux send-keys -t proposer "$cd_cmd && $claude_cmd" Enter

# Reviewer AI 起動
echo "[Starting] Reviewer AI を起動中..."
tmux new-session -d -s reviewer -x 200 -y 50
sleep 0.3
cd_cmd="cd \"$PROJECT_DIR/reviewer\""
claude_cmd="PROMPT=\$(cat CLAUDE.md) && claude --dangerously-skip-permissions --model sonnet --append-system-prompt \"\$PROMPT\""
tmux send-keys -t reviewer "$cd_cmd && $claude_cmd" Enter

# Watcher 起動
echo "[Starting] Watcher を起動中..."
sleep 2
tmux new-session -d -s idea-watcher "bash $SCRIPT_DIR/watch_ideas.sh"

echo ""
echo "=== システム起動完了 ==="
echo ""
echo "📋 セッション一覧:"
echo "  - proposer      : 提案AI（アイデア生成）"
echo "  - reviewer      : 審査AI（評価・フィードバック）"
echo "  - idea-watcher  : ワークフロー管理"
echo ""
echo "💡 操作方法:"
echo "  tmux attach -t proposer     # 提案AIに接続"
echo "  tmux attach -t reviewer     # 審査AIに接続"
echo "  tmux attach -t idea-watcher # Watcherに接続"
echo ""
echo "  Ctrl+B → D でデタッチ（セッションから抜ける）"
echo ""
echo "🛑 システム停止:"
echo "  bash $SCRIPT_DIR/stop_idea_system.sh"
echo ""
echo "📊 ステータス確認:"
echo "  cat $PROJECT_DIR/ideas/state.json"
echo ""
