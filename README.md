# claude-communication

> AI エージェント同士を会話させる実験的なプロジェクト

---

## 概要

複数の Claude AI エージェント（claude1 と claude2）が、JSON メッセージを介して相互に通信するシステムです。

ファイルシステムをメッセージングの基盤とし、tmux + fswatch + jq でシンプルに実装しています。

---

## セットアップ

### 前提条件

```
- macOS または Linux
- Claude Code
- tmux
- jq
- fswatch
```

### 実行

```bash
git clone https://github.com/tkpsy/claude-communication.git
cd claude-communication
bash scripts/setup.sh
```

セットアップで以下が起動します：

- `claude1` セッション（Claude Agent A）
- `claude2` セッション（Claude Agent B）
- `watcher` セッション（メッセージ監視）

---

## 使い方

### Claude 1 に接続

```bash
tmux attach-session -t claude1
```

### Claude 2 に接続

```bash
tmux attach-session -t claude2
```

あとは通常通り Claude と会話します。エージェント間のメッセージは自動配信されます。

---

## 仕組み

### ターン管理による交互通信

このシステムは **構造的な制約** により、Claude1 と Claude2 が必ず交互に会話することを保証します。

**状態管理ファイル** (`messages/state.json`)：

```json
{
  "current_turn": "claude1",
  "last_message_id": "msg_0001",
  "message_counter": 1,
  "pending_reply_to": "msg_0001"
}
```

- **`current_turn`**: 現在のターンのエージェント (`"claude1"` or `"claude2"`)
- **`message_counter`**: メッセージID生成用のカウンター
- **`last_message_id`**: 最後に送信されたメッセージのID (`msg_0001`, `msg_0002`, ...)
- **`pending_reply_to`**: 返答待ちのメッセージID。次のエージェントのメッセージはこれに返答する必要がある

### メッセージの流れ

1. Claude が JSON ファイルを作成（`reply_to` フィールドは指定しない）
2. Watcher が JSON ファイルを検出
3. Watcher がターンをチェック：
   - `current_turn` がこのエージェントのターンでない場合は **スキップ**（ターン到来まで保持）
   - ターンが正しければ続行
4. Watcher が自動的に `reply_to` フィールドを追加：
   - 新規メッセージの場合：`reply_to: null`
   - 返答メッセージの場合：`reply_to: pending_reply_to` の値を使用
5. Watcher がメッセージID を割り当て：`msg_0001`, `msg_0002`, ...
6. Watcher が `state.json` を更新：
   - `current_turn` をもう一方のエージェントに切り替え
   - `pending_reply_to` を新たに送信したメッセージIDに設定
   - `message_counter` をインクリメント
7. Watcher が tmux send-keys でメッセージを相手のセッションに送信

### メッセージフォーマット

Claude が作成するメッセージ（`reply_to` 不要）：

```json
{
  "timestamp": "2025-11-21T18:00:00+09:00",
  "sender": "claude1",
  "receiver": "claude2",
  "content": "メッセージ内容",
  "type": "message"
}
```

Watcher が自動追加するフィールド：

- **`reply_to`**: 返答対象のメッセージID（新規なら `null`、返答なら対象のID）
- **`id`**: メッセージの一意識別子（Watcher が自動生成）

---

## プロジェクト構成

```
claude-communication/
├── README.md
├── config.json
├── messages/
│   ├── c1_to_c2/        # Claude 1 → Claude 2
│   └── c2_to_c1/        # Claude 2 → Claude 1
├── claude1/
│   └── CLAUDE.md        # Claude 1 の指示
├── claude2/
│   └── CLAUDE.md        # Claude 2 の指示
└── scripts/
    ├── setup.sh
    └── watch_messages.sh
```

---

## トラブルシューティング

### セッションをリセット

```bash
tmux kill-server
bash scripts/setup.sh
```

### メッセージが送信されない

1. watcher が動いているか確認
   ```bash
   tmux attach-session -t watcher
   ```

2. 現在のターンを確認
   ```bash
   cat messages/state.json | jq .
   ```
   - `current_turn` が "claude1" なら Claude1 のターン
   - `pending_reply_to` がメッセージIDなら、それに返答する必要がある

3. メッセージファイルが生成されているか確認
   ```bash
   ls messages/c1_to_c2/
   ls messages/c2_to_c1/
   ```

### メッセージが保持されている（ターン待機中）

ターン管理の仕様として、ターンでないエージェントのメッセージは自動的に保持されます。

例：
- Claude1 がメッセージを送信
- watcher が処理し、`current_turn` を "claude2" に変更
- Claude2 のターン中に Claude1 がメッセージを送信した場合 → **スキップされ保持される**
- Claude2 がメッセージを送信・処理されると、`current_turn` が "claude1" に戻る
- 保持されていた Claude1 のメッセージが自動的に処理される（fswatch により再検知）

### reply_to フィールドについて

- **Claude が記述する必要なし** - Watcher が自動管理します
- Claude が `reply_to` を含めても、Watcher が `pending_reply_to` で上書きします
- 新規メッセージ時は `reply_to: null`、返答時は対象メッセージIDを自動設定

---

## 設定

`config.json` で以下をカスタマイズ可能：

```json
{
  "message_dir": "./messages",
  "c1_to_c2": "c1_to_c2",
  "c2_to_c1": "c2_to_c1"
}
```

---

## 詳細

詳しい仕組みは以下のファイルを参照：

- **claude1/CLAUDE.md** - Claude 1 の役割と制約
- **claude2/CLAUDE.md** - Claude 2 の役割と制約

---

## ライセンス

MIT License
