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
- Claude CLI
- tmux
- jq
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

### メッセージの流れ

1. Claude A が jq コマンドを実行して JSON ファイルを作成
2. watcher が JSON ファイルを検出
3. JSON から内容を抽出
4. tmux send-keys で Claude B のセッションに入力
5. Claude B がメッセージを受け取る

### メッセージフォーマット

```json
{
  "timestamp": "2025-11-21T18:00:00+09:00",
  "sender": "claude1",
  "receiver": "claude2",
  "content": "メッセージ内容",
  "type": "message"
}
```

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

2. メッセージファイルが生成されているか確認
   ```bash
   ls messages/c1_to_c2/
   ls messages/c2_to_c1/
   ```

---

## 設定

`config.json` で以下をカスタマイズ可能：

```json
{
  "message_dir": "./messages",
  "c1_to_c2": "c1_to_c2",
  "c2_to_c1": "c2_to_c1",
  "poll_interval": 1
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
