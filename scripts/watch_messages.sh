#!/bin/bash

# 絶対パスを取得
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="$PROJECT_DIR/config.json"

# config.json の message_dir が相対パスの場合は PROJECT_DIR を基準にする
MESSAGE_DIR=$(jq -r '.message_dir' "$CONFIG_FILE")
if [[ ! "$MESSAGE_DIR" = /* ]]; then
  MESSAGE_DIR="$PROJECT_DIR/$MESSAGE_DIR"
fi
# パスを正規化（./ を削除）
MESSAGE_DIR=$(cd "$MESSAGE_DIR" && pwd)
CLAUDE1_SESSION="claude1"
CLAUDE2_SESSION="claude2"
C1_TO_C2=$(jq -r '.c1_to_c2' "$CONFIG_FILE")
C2_TO_C1=$(jq -r '.c2_to_c1' "$CONFIG_FILE")

C1_TO_C2_DIR="$MESSAGE_DIR/$C1_TO_C2"
C2_TO_C1_DIR="$MESSAGE_DIR/$C2_TO_C1"
STATE_FILE="$MESSAGE_DIR/state.json"

echo "[Watcher] Started watching messages with ID-based turn management..."

# メッセージにIDを付与して処理する
process_messages() {
  local dir=$1              # メッセージディレクトリ
  local target_session=$2   # 送信先セッション
  local expected_turn=$3    # 予期されるターン（"claude1" or "claude2"）
  local next_turn=$4        # 次のターン

  for json_file in "$dir"/*.json; do
    if [ -f "$json_file" ]; then
      # 現在のターンを確認
      current_turn=$(jq -r '.current_turn' "$STATE_FILE" 2>/dev/null || echo "unknown")

      # ターンチェック
      if [ "$current_turn" != "$expected_turn" ]; then
        echo "[Watcher] ✗ Not $expected_turn's turn (current: $current_turn) - Skipping $(basename "$json_file")"
        continue
      fi

      echo "[Watcher] Processing: $(basename "$json_file") (Turn: $expected_turn)"

      # 現在の pending_reply_to を確認
      pending_reply=$(jq -r '.pending_reply_to' "$STATE_FILE" 2>/dev/null || echo "null")

      # reply_to フィールドがない場合は pending_reply_to を使用
      # JSONに reply_to フィールドがあるか確認
      has_reply_to=$(jq 'has("reply_to")' "$json_file" 2>/dev/null)

      if [ "$has_reply_to" != "true" ]; then
        # reply_to フィールドが無い場合、pending_reply_to を使用（返答メッセージ）
        if [ "$pending_reply" = "null" ]; then
          # pending_reply_to が null なら新規メッセージ
          reply_to="null"
          jq '.reply_to = null' "$json_file" > "${json_file}.tmp"
          mv "${json_file}.tmp" "$json_file"
        else
          # pending_reply_to に値がある = 前のメッセージへの返答
          reply_to="$pending_reply"
          jq --arg reply_to "$pending_reply" '.reply_to = $reply_to' "$json_file" > "${json_file}.tmp"
          mv "${json_file}.tmp" "$json_file"
        fi
      else
        reply_to=$(jq -r '.reply_to' "$json_file" 2>/dev/null)
      fi

      # reply_to の検証
      # 1. reply_to が null なら新規メッセージ（pending_reply_to も null であること）
      # 2. reply_to が null でなければ、pending_reply_to と一致する必要あり
      if [ "$reply_to" = "null" ]; then
        # 新規メッセージの場合、pending_reply_to が null であることを確認
        if [ "$pending_reply" != "null" ]; then
          echo "[Watcher] ✗ Invalid: New message but waiting for reply to $pending_reply - Skipping $(basename "$json_file")"
          continue
        fi
      else
        # 返答メッセージの場合、pending_reply_to と一致することを確認
        if [ "$reply_to" != "$pending_reply" ]; then
          echo "[Watcher] ✗ Invalid: reply_to=$reply_to but pending_reply_to=$pending_reply - Skipping $(basename "$json_file")"
          continue
        fi
      fi

      # JSONからID情報を取得
      msg_id=$(jq -r '.id' "$json_file" 2>/dev/null || echo "")

      # ID が未設定なら Watcher が ID を振る
      if [ -z "$msg_id" ] || [ "$msg_id" = "null" ]; then
        # メッセージカウンターを読み込んでインクリメント
        current_counter=$(jq '.message_counter' "$STATE_FILE")
        new_counter=$((current_counter + 1))
        msg_id="msg_$(printf "%04d" $new_counter)"

        echo "[Watcher] 📌 Assigning ID: $msg_id"

        # メッセージに ID を追加
        jq --arg id "$msg_id" '.id = $id' "$json_file" > "${json_file}.tmp"
        mv "${json_file}.tmp" "$json_file"
      fi

      # JSONから内容を取得
      content=$(jq -r '.content' "$json_file" 2>/dev/null || echo "")

      if [ -n "$content" ]; then
        echo "[Watcher] ✓ Sending to $target_session (ID: $msg_id): $content"
        # tmux send-keysでメッセージを送信
        tmux send-keys -t "$target_session" "$content"
        sleep 0.2
        tmux send-keys -t "$target_session" C-m

        # state.json を更新
        # - current_turn を切り替え
        # - last_message_id を更新
        # - pending_reply_to を新しく送信したメッセージIDに設定（次のエージェントがこれに返答することを期待）
        # - message_counter を保持
        jq --arg id "$msg_id" --arg turn "$next_turn" --arg pending "$msg_id" --arg counter "$new_counter" \
          '.current_turn = $turn | .last_message_id = $id | .pending_reply_to = $pending | .message_counter = ($counter | tonumber)' "$STATE_FILE" > "${STATE_FILE}.tmp"
        mv "${STATE_FILE}.tmp" "$STATE_FILE"
        echo "[Watcher] Turn switched to: $next_turn | Last message ID: $msg_id | Waiting for reply to: $msg_id"
      fi

      # ファイルを削除
      rm -f "$json_file"
    fi
  done
}

# C1->C2メッセージ処理（Claude 1のターン）
process_c1_to_c2() {
  process_messages "$C1_TO_C2_DIR" "$CLAUDE2_SESSION" "claude1" "claude2"
}

# C2->C1メッセージ処理（Claude 2のターン）
process_c2_to_c1() {
  process_messages "$C2_TO_C1_DIR" "$CLAUDE1_SESSION" "claude2" "claude1"
}

# fswatch 必須（ポーリング廃止）
fswatch -0 "$C1_TO_C2_DIR" "$C2_TO_C1_DIR" | while read -d '' event; do
  # イベント検知したら両方チェック
  process_c1_to_c2
  process_c2_to_c1
done
