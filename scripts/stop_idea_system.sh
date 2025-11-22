#!/bin/bash

# アイデア評価システム停止スクリプト

echo "=== アイデア評価システム停止 ==="

# 全セッションを停止
echo "[Stopping] セッションを停止中..."
tmux kill-session -t proposer 2>/dev/null && echo "  ✓ proposer 停止" || echo "  - proposer (not running)"
tmux kill-session -t reviewer 2>/dev/null && echo "  ✓ reviewer 停止" || echo "  - reviewer (not running)"
tmux kill-session -t idea-watcher 2>/dev/null && echo "  ✓ idea-watcher 停止" || echo "  - idea-watcher (not running)"

echo ""
echo "=== システム停止完了 ==="
