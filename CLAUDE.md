# Claude Communication System - Project Overview

## プロジェクト概要

このプロジェクトは、複数の独立した Claude プロセス（Claude Agent A/B）が JSON メッセージを介して相互通信するシステムです。

## 目的

- 2つの Claude エージェントが協力してタスク実行
- エージェント間での情報共有
- マルチエージェント協力作業の実装

## アーキテクチャ

```
Claude 1 → [jq] → JSON file → [watcher] → tmux send-keys → Claude 2
Claude 2 → [jq] → JSON file → [watcher] → tmux send-keys → Claude 1
```

### 主要コンポーネント

1. **Claude A (claude1)** - エージェント A のプロセス
2. **Claude B (claude2)** - エージェント B のプロセス
3. **fswatch / polling** - ファイルシステム監視
4. **watch_messages.sh** - メッセージ処理エンジン
5. **JSON メッセージ** - 通信フォーマット

## メッセージプロトコル

### JSON フォーマット

```json
{
  "timestamp": "ISO 8601 形式のタイムスタンプ",
  "sender": "claude1 または claude2",
  "receiver": "claude1 または claude2",
  "content": "メッセージの内容",
  "type": "message"
}
```

### メッセージ内容の規格

メッセージ内容には、必ず以下のプリアンブルを含める：

```
これは Claude [N] からのメッセージです。jq のコマンドを Bash ツールで実行して JSON に書き出し、返答してください。[実際のメッセージ内容]
```

このプリアンブルにより、受信側 Claude が確実に以下を実行する：
- メッセージを解析する
- jq コマンドを Bash ツールで実行する
- JSON 形式で返答を送信する

## システムの制約

- Bash ツールは jq コマンド実行時のみ使用可能
- それ以外のツール（Read、Edit、Glob など）は禁止
- メッセージは必ず JSON 形式
- 送信前に必ずプリアンブルを含める

## ファイル構成

```
/project/
├── claude1/CLAUDE.md       - Claude 1 の役割と指示
├── claude2/CLAUDE.md       - Claude 2 の役割と指示
├── config.json             - システム設定
├── scripts/
│   ├── setup.sh            - システムセットアップ
│   └── watch_messages.sh   - メッセージ監視エンジン
└── messages/
    ├── c1_to_c2/           - Claude 1 → Claude 2
    └── c2_to_c1/           - Claude 2 → Claude 1
```

## 実装上の注意点

1. **メッセージ形式は厳密に守る** - プリアンブルが含まれていないとエージェントが混乱する
2. **Bash ツール実行が必須** - コマンドテキストの出力ではなく、実際に実行する
3. **ファイルシステムが信頼性の基盤** - JSON ファイルが確実に作成・検出される必要がある
4. **互いの役割を理解** - エージェント間で役割分担を明確にする

## 今後の拡張可能性

- エージェント数の増加（3以上）
- メッセージングプロトコルの拡張
- キューイングシステムの導入
- ロギング・監査機能の追加
