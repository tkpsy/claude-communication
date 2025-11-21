# Multi-Agent Claude Communication System

2つの独立した Claude プロセス（Claude A と Claude B）を tmux で起動し、JSON メッセージを介して通信するシステムです。

## クイックスタート

### セットアップ（最初に1回）

```bash
bash scripts/setup.sh
```

この1つのコマンドで：
- ✅ `claude1` セッション起動（Claude A）
- ✅ `claude2` セッション起動（Claude B）
- ✅ `watcher` セッション起動（メッセージ監視）

### 使用（毎回）

**ターミナル1：Claude A に接続**
```bash
tmux attach-session -t claude1
```

**ターミナル2：Claude B に接続**
```bash
tmux attach-session -t claude2
```

以上です。あとは通常通り Claude と会話できます。

---

## メッセージ送信の仕組み

### 基本フロー

```
Claude A が JSON ファイルを保存
         ↓
    fswatch が検出
         ↓
watch_messages.sh が処理
         ↓
tmux send-keys で Claude B に送信
         ↓
Claude B のプロンプトに自動入力
```

### 具体例：Claude 1 → Claude 2

Claude 1 がこのコマンドを実行：

```bash
jq -n \
  --arg timestamp "$(date -Iseconds)" \
  --arg sender "claude1" \
  --arg receiver "claude2" \
  --arg content "こんにちは、Claude 2！" \
  '{timestamp: $timestamp, sender: $sender, receiver: $receiver, content: $content, type: "message"}' \
  > /Users/tkpsy/multi-agent/messages/c1_to_c2/msg_$(date +%s%N).json
```

すると自動的に Claude 2 のプロンプトに `こんにちは、Claude 2！` が送信されます。

---

## ファイル構造

```
/Users/tkpsy/multi-agent/
├── README.md                   # このファイル
├── CLAUDE.md                   # 詳細な仕組みドキュメント
├── config.json                 # 設定ファイル
├── messages/                   # メッセージファイル格納先
│   ├── c1_to_c2/              # Claude 1 → Claude 2
│   └── c2_to_c1/              # Claude 2 → Claude 1
└── scripts/
    ├── setup.sh               # セットアップスクリプト
    ├── watch_messages.sh      # ファイル監視エンジン
    └── message_monitor.sh     # メッセージモニタ（参考）
```

---

## ドキュメント

- **[CLAUDE.md](./CLAUDE.md)** ← **詳しい仕組みはこちらを読んでください**
  - JSON メッセージフォーマット
  - ファイル命名規則
  - トラブルシューティング
  - セキュリティに関する注意

---

## 設定

`config.json` で以下を変更可能：

```json
{
  "message_dir": "/Users/tkpsy/multi-agent/messages",
  "c1_to_c2": "c1_to_c2",
  "c2_to_c1": "c2_to_c1",
  "tmux_session": "multi-agent",
  "claude1_window": "claude1",
  "claude2_window": "claude2",
  "poll_interval": 1
}
```

---

## トラブルシューティング

### 全セッションをリセット
```bash
tmux kill-server
bash /Users/tkpsy/multi-agent/scripts/setup.sh
```

### メッセージが送信されない場合
1. JSON ファイルが正しく保存されているか確認
2. watcher セッションのログを確認：`tmux attach-session -t watcher`
3. 詳細は [CLAUDE.md](./CLAUDE.md) のトラブルシューティングを参照

### fswatch をインストール（オプション）
```bash
brew install fswatch
```
（fswatch なしでもポーリングで動作します）

---

## 次のステップ

詳細な仕組みや使用方法は [CLAUDE.md](./CLAUDE.md) を参照してください。
