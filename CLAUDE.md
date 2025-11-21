# Claude-to-Claude メッセージシステム

2つのClaudeプロセス（A と B）が JSON メッセージを介して通信するシステムの仕組みです。

## システムの流れ

```
Claude A                   ファイルシステム              Claude B
   │                            │                        │
   │  ① JSONメッセージを       │                        │
   │     messages/a_to_b/       │                        │
   │     に保存する              │                        │
   └──────────────────────────>│                        │
                                │                        │
                                │  ② fswatch が        │
                                │     ファイル保存を    │
                                │     検出する           │
                                │                        │
                                │  ③ watch_messages.sh  │
                                │     JSONを読み込む     │
                                │                        │
                                │  ④ tmux send-keys で │
                                │     メッセージを      │
                                │     送信               │
                                │────────────────────>│
                                │                   プロンプトに自動入力
```

## ファイル配置

```
/Users/tkpsy/multi-agent/messages/
├── c1_to_c2/               ← Claude 1 → Claude 2 のメッセージ
│   └── msg_YYYYMMDD_HHMMS.json
│
└── c2_to_c1/               ← Claude 2 → Claude 1 のメッセージ
    └── msg_YYYYMMDD_HHMMS.json
```

## JSONメッセージフォーマット

Claude A が Claude B にメッセージを送る場合：

```json
{
  "timestamp": "2025-11-21T16:00:00+00:00",
  "sender": "claude_a",
  "receiver": "claude_b",
  "content": "ここにメッセージ内容を記述",
  "type": "message"
}
```

### フィールド説明

| フィールド | 説明 | 例 |
|----------|------|-----|
| `timestamp` | ISO 8601 形式のタイムスタンプ | `2025-11-21T16:10:33+09:00` |
| `sender` | 送信元（claude1 または claude2） | `claude1` |
| `receiver` | 受信先（claude1 または claude2） | `claude2` |
| `content` | 実際のメッセージ内容 | `こんにちは、Claude 2です` |
| `type` | メッセージタイプ（固定） | `message` |

## 使用方法

### 1. セットアップ（最初に1回）

```bash
bash /Users/tkpsy/multi-agent/scripts/setup.sh
```

これで以下が起動します：
- `claude1` セッション（Claude A）
- `claude2` セッション（Claude B）
- `watcher` セッション（ファイル監視）

### 2. Claude A からメッセージを送信

Claude A が Claude B にメッセージを送りたい場合、以下の JSON ファイルを作成して保存：

```bash
# Claude A のセッション内、または外から
jq -n \
  --arg timestamp "$(date -Iseconds)" \
  --arg sender "claude1" \
  --arg receiver "claude2" \
  --arg content "こんにちは！何かお手伝いできることはありますか？" \
  '{timestamp: $timestamp, sender: $sender, receiver: $receiver, content: $content, type: "message"}' \
  > /Users/tkpsy/multi-agent/messages/c1_to_c2/msg_$(date +%s%N).json
```

### 3. 自動処理

1. **fswatch** が `messages/c1_to_c2/` のファイル保存を検出
2. **watch_messages.sh** が JSON を読み込む
3. **content** フィールドを抽出
4. **tmux send-keys** で Claude 2 のセッションに自動入力
5. JSON ファイルを削除

### 4. Claude B が応答

Claude B が受け取ったメッセージに対して応答したい場合、同様に：

```bash
jq -n \
  --arg timestamp "$(date -Iseconds)" \
  --arg sender "claude2" \
  --arg receiver "claude1" \
  --arg content "こんにちは！手伝えることがあればお知らせください" \
  '{timestamp: $timestamp, sender: $sender, receiver: $receiver, content: $content, type: "message"}' \
  > /Users/tkpsy/multi-agent/messages/c2_to_c1/msg_$(date +%s%N).json
```

## 実装の詳細

### watch_messages.sh の動作

`watch_messages.sh` は以下の処理を継続的に実行：

1. `messages/c1_to_c2/` と `messages/c2_to_c1/` を監視
2. 新しい JSON ファイルが作成されたら検出
3. JSON から `content` を抽出
4. `tmux send-keys` で対象セッションに送信
5. 処理済みの JSON ファイルを削除

```bash
# 例：Claude 1 からのメッセージが来た場合
tmux send-keys -t claude2 "ここにメッセージ内容が入る" Enter
```

### 監視方法

- **fswatch がインストールされている場合**：ファイルシステムイベントで即座に検出
- **fswatch がない場合**：定期的なポーリング（config.json の `poll_interval` で設定）

## 仕様

### メッセージファイル命名規則

```
msg_<UnixTimestamp><Nanoseconds>.json

例：
msg_1700590833123456789.json
msg_1700590834987654321.json
```

### タイムスタンプフォーマット

ISO 8601 準拠：
```
2025-11-21T16:10:33+09:00
```

### 送信者・受信者の指定

- `claude1` : Claude A
- `claude2` : Claude B

## トラブルシューティング

### メッセージが送信されない

1. JSON ファイルが正しくフォーマットされているか確認
   ```bash
   cat /Users/tkpsy/multi-agent/messages/c1_to_c2/msg_*.json | jq .
   ```

2. watcher セッションが動作しているか確認
   ```bash
   tmux list-sessions
   ```

3. watch_messages.sh の出力を確認
   ```bash
   tmux attach-session -t watcher
   ```

### ファイルが削除されない

- watch_messages.sh が正常に実行されていることを確認
- ディレクトリの書き込み権限を確認

## セキュリティに関する注意

- `content` フィールドに記述されたテキストは自動的に `tmux send-keys` に渡されます
- シェルメタ文字（`$`, `|`, `;` など）は適切にエスケープされます
- ファイルシステムのアクセス制御を適切に設定してください

## 今後の拡張案

- メッセージ履歴の保存
- 複数の Claude インスタンス間での通信
- メッセージの優先度設定
- タイムアウト機能
- 確認応答（ACK）メッセージ
