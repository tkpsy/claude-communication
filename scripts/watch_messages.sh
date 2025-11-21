#!/bin/bash

SCRIPT_DIR="$(dirname "$0")"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="$PROJECT_DIR/config.json"

# config.json の message_dir が相対パスの場合は PROJECT_DIR を基準にする
MESSAGE_DIR=$(jq -r '.message_dir' "$CONFIG_FILE")
if [[ ! "$MESSAGE_DIR" = /* ]]; then
  MESSAGE_DIR="$PROJECT_DIR/$MESSAGE_DIR"
fi
CLAUDE1_SESSION="claude1"
CLAUDE2_SESSION="claude2"
C1_TO_C2=$(jq -r '.c1_to_c2' "$CONFIG_FILE")
C2_TO_C1=$(jq -r '.c2_to_c1' "$CONFIG_FILE")
POLL_INTERVAL=$(jq -r '.poll_interval' "$CONFIG_FILE")

C1_TO_C2_DIR="$MESSAGE_DIR/$C1_TO_C2"
C2_TO_C1_DIR="$MESSAGE_DIR/$C2_TO_C1"

echo "[Watcher] Started watching messages..."

process_messages() {
  local dir=$1
  local target_session=$2

  for json_file in "$dir"/*.json; do
    if [ -f "$json_file" ]; then
      echo "[Watcher] Processing: $(basename "$json_file")"

      # JSONから内容を取得
      content=$(jq -r '.content' "$json_file" 2>/dev/null || echo "")

      if [ -n "$content" ]; then
        echo "[Watcher] Sending to $target_session: $content"
        # tmux send-keysでメッセージを送信
        tmux send-keys -t "$target_session" "$content"
        sleep 0.2
        tmux send-keys -t "$target_session" C-m
      fi

      # ファイルを削除
      rm -f "$json_file"
    fi
  done
}

# C1->C2メッセージ処理（Claude 2に送信）
process_c1_to_c2() {
  process_messages "$C1_TO_C2_DIR" "$CLAUDE2_SESSION"
}

# C2->C1メッセージ処理（Claude 1に送信）
process_c2_to_c1() {
  process_messages "$C2_TO_C1_DIR" "$CLAUDE1_SESSION"
}

# メインループ（ポーリング方式で統一）
while true; do
  process_c1_to_c2
  process_c2_to_c1
  sleep "$POLL_INTERVAL"
done
