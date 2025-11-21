# claude-communication

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-active-brightgreen.svg)

> **複数の Claude エージェントが JSON で自動通信する。**
> エージェント間協力作業をシンプルに実装できるシステム。

---

## ✨ 何ができるのか

このプロジェクトは、**複数の独立した Claude AI エージェントを tmux で起動し、JSON メッセージを介して自動で通信させる** システムです。

### 主な特徴

- **簡単セットアップ** - `bash scripts/setup.sh` で即座に2つの Claude エージェントが起動
- **自動通信** - エージェント間の JSON メッセージを自動検出・配信
- **シンプル設計** - ファイルシステムベースで複雑な依存関係なし
- **拡張可能** - エージェント数を増やすのは簡単
- **デバッグ容易** - JSON ファイルで通信内容が可視化される

---

## 🚀 今すぐ始める（Getting Started）

### 前提条件

```
- macOS または Linux
- Claude CLI がインストール済み
- tmux がインストール済み
- jq がインストール済み
```

### セットアップ（最初に1回）

```bash
git clone https://github.com/tkpsy/claude-communication.git
cd claude-communication
bash scripts/setup.sh
```

このコマンドで：
- ✅ Claude Agent A（`claude1` セッション）が起動
- ✅ Claude Agent B（`claude2` セッション）が起動
- ✅ メッセージ監視エンジン（`watcher` セッション）が起動

### 使用開始（毎回）

**ターミナル1：Claude A に接続**
```bash
tmux attach-session -t claude1
```

**ターミナル2：Claude B に接続**
```bash
tmux attach-session -t claude2
```

あとは通常通り Claude と会話できます。メッセージはエージェント間で自動送信されます。

---

## 💡 実例：何が起きるのか

### Claude A が Claude B にメッセージを送信する流れ

1. Claude A が以下のコマンドを実行
   ```bash
   jq -n \
     --arg timestamp "$(date -Iseconds)" \
     --arg sender "claude1" \
     --arg receiver "claude2" \
     --arg content "これはClaude 1からのメッセージです。jqのコマンドをBashツールで実行してJSONに書き出し、返答してください。テストです" \
     '{timestamp: $timestamp, sender: $sender, receiver: $receiver, content: $content, type: "message"}' \
     > ./messages/c1_to_c2/msg_$(date +%s%N).json
   ```

2. ファイルが作成される
   ```json
   {
     "timestamp": "2025-11-21T18:00:00+09:00",
     "sender": "claude1",
     "receiver": "claude2",
     "content": "これはClaude 1からのメッセージです。jqのコマンドをBashツールで実行してJSONに書き出し、返答してください。テストです",
     "type": "message"
   }
   ```

3. watcher が検出し、Claude B のプロンプトに自動入力
   ```
   > これはClaude 1からのメッセージです。jqのコマンドをBashツールで実行してJSONに書き出し、返答してください。テストです
   ```

4. Claude B が同様の jq コマンドで返答を送信

---

## ❓ なぜこのシステムを使うのか

### 既存の方法との違い

| 方法 | メリット | デメリット |
|------|---------|----------|
| **REST API 統合** | リアルタイム通信 | ネットワーク管理が複雑 |
| **メッセージキュー** | スケーラブル | セットアップが複雑 |
| **このシステム** | シンプル、デバッグ容易 | ローカル用途向け |

### 向いている用途

✅ **こんな時に使う：**
- エージェント間協力作業の実験
- マルチエージェント AI のプロトタイピング
- ローカル開発環境でのテスト
- AI エージェント動作の可視化・デバッグ

❌ **こんな時には向かない：**
- 本番環境での高負荷運用
- リモートサーバー間の通信
- リアルタイム性が重要な用途

---

## 📁 プロジェクト構成

```
claude-communication/
├── README.md                    # このファイル
├── config.json                  # 設定ファイル
├── messages/                    # メッセージファイル
│   ├── c1_to_c2/               # Claude 1 → Claude 2
│   └── c2_to_c1/               # Claude 2 → Claude 1
├── claude1/
│   └── CLAUDE.md               # Claude 1 の役割・指示
├── claude2/
│   └── CLAUDE.md               # Claude 2 の役割・指示
└── scripts/
    ├── setup.sh                # セットアップスクリプト
    └── watch_messages.sh       # メッセージ監視エンジン
```

---

## ⚙️ 設定

`config.json` で動作をカスタマイズ可能：

```json
{
  "message_dir": "./messages",    # メッセージ格納ディレクトリ
  "c1_to_c2": "c1_to_c2",        # Claude 1→2 のメッセージフォルダ
  "c2_to_c1": "c2_to_c1",        # Claude 2→1 のメッセージフォルダ
  "poll_interval": 1              # 監視のポーリング間隔（秒）
}
```

---

## 🔧 トラブルシューティング

### セッションをリセットしたい
```bash
tmux kill-server
bash scripts/setup.sh
```

### メッセージが送信されない場合
1. watcher セッションが動いているか確認
   ```bash
   tmux attach-session -t watcher
   ```

2. メッセージファイルが生成されているか確認
   ```bash
   ls -la messages/c1_to_c2/
   ls -la messages/c2_to_c1/
   ```

3. JSON フォーマットが正しいか確認

---

## 📚 詳細情報

- **claude1/CLAUDE.md** - Claude Agent A の詳細な役割と仕様
- **claude2/CLAUDE.md** - Claude Agent B の詳細な役割と仕様

---

## 🤝 貢献について

バグ報告や機能提案は Issue で受け付けています。
Pull Request も大歓迎です。

---

## 📜 ライセンス

MIT License - 詳細は [LICENSE](./LICENSE) を参照

---

## 💬 Feedback

このプロジェクトについてのご意見・ご質問は、Issues で気軽にお知らせください。
