# 🚀 AI Idea Evaluation System

アプリ開発アイデアの提案と審査を自動化するAI対話システム

## 🎯 概要

2つのAIが協力してアプリ開発のアイデアを生み出し、洗練させていくシステムです。

- **Proposer AI（提案AI）**: 革新的なアプリアイデアを生成
- **Reviewer AI（審査AI）**: 厳格な基準でアイデアを評価・フィードバック
- **Watcher**: ワークフロー を自動管理

## 🏗️ システム構成

```
ideas/
├── proposals/     # 提案AIがアイデアを投稿
├── reviews/       # 審査AIが評価を投稿
├── approved/      # 承認されたアイデア（40点以上）
├── rejected/      # 却下されたアイデア（24点以下）
└── state.json     # システム状態

proposer/          # 提案AI用ディレクトリ
└── CLAUDE.md      # 提案AIのプロンプト

reviewer/          # 審査AI用ディレクトリ
└── CLAUDE.md      # 審査AIのプロンプト

scripts/
├── start_idea_system.sh   # システム起動
├── stop_idea_system.sh    # システム停止
└── watch_ideas.sh         # ワークフロー管理
```

## 🔄 ワークフロー

```
1. Proposer AI
   ↓ アイデアを提案（proposals/idea.json）

2. Reviewer AI
   ↓ 5つの観点で評価（reviews/review.json）

3. Watcher が判定
   ├─ 40点以上 → approved/ に保存 → 次のアイデア生成
   ├─ 25-39点 → フィードバック送信 → Proposer が改善
   └─ 24点以下 → rejected/ に保存 → 新アイデア生成
```

## 📊 評価基準

各項目10点満点、合計50点満点で評価：

1. **革新性 (Innovation)**: 新しい視点・アプローチ
2. **実用性 (Practicality)**: 実際に使われる可能性
3. **技術的実現性 (Technical Feasibility)**: 実装の現実性
4. **市場性 (Market Potential)**: ビジネスモデルの妥当性
5. **スケーラビリティ (Scalability)**: 成長・拡大の可能性

### 判定基準

- ✅ **承認 (APPROVED)**: 40点以上
- 🔄 **改善要求 (NEEDS_IMPROVEMENT)**: 25-39点
- ❌ **却下 (REJECTED)**: 24点以下

## 🚀 使い方

### 1. システム起動

```bash
bash scripts/start_idea_system.sh
```

これで以下の3つのセッションが起動します：
- `proposer`: 提案AI
- `reviewer`: 審査AI
- `idea-watcher`: ワークフロー管理

### 2. セッションに接続

```bash
# 提案AIの様子を見る
tmux attach -t proposer

# 審査AIの様子を見る
tmux attach -t reviewer

# Watcherのログを見る
tmux attach -t idea-watcher
```

**操作方法:**
- `Ctrl+B` → `D`: セッションから抜ける（デタッチ）
- セッションは裏で動き続けます

### 3. ステータス確認

```bash
# システム状態を確認
cat ideas/state.json

# 承認されたアイデアを見る
ls -la ideas/approved/

# 却下されたアイデアを見る
ls -la ideas/rejected/
```

### 4. システム停止

```bash
bash scripts/stop_idea_system.sh
```

## 📁 出力フォーマット

### アイデアJSON (proposals/idea.json)

```json
{
  "id": "idea_20241122_140530",
  "title": "AI家庭教師アプリ",
  "problem": "個別指導の費用が高く、学習者が…",
  "solution": "AIによる24時間対応の個別指導…",
  "target_users": "小中高生とその保護者…",
  "unique_value": "学習履歴から最適な問題を自動生成…",
  "business_model": "月額サブスクリプション…",
  "tech_stack": ["Next.js", "Claude API", "PostgreSQL"],
  "features": [
    "AI対話型学習",
    "進捗可視化ダッシュボード",
    "保護者向けレポート"
  ],
  "iteration": 2,
  "created_at": "2024-11-22T14:05:30Z"
}
```

### 評価JSON (reviews/review.json)

```json
{
  "idea_id": "idea_20241122_140530",
  "scores": {
    "innovation": 8,
    "practicality": 9,
    "technical_feasibility": 8,
    "market_potential": 9,
    "scalability": 8
  },
  "total_score": 42,
  "status": "APPROVED",
  "feedback": {
    "strengths": [
      "明確なニーズがある市場",
      "収益モデルが明確"
    ],
    "weaknesses": [
      "競合との差別化がやや弱い"
    ],
    "suggestions": [
      "独自の学習アルゴリズムを強調"
    ]
  },
  "reviewed_at": "2024-11-22T14:10:45Z",
  "iteration": 2
}
```

## 🎨 カスタマイズ

### 評価基準の変更

`reviewer/CLAUDE.md` を編集して、評価基準やスコア配分を調整できます。

### 提案の方向性を変更

`proposer/CLAUDE.md` を編集して、特定の分野（例: B2B SaaS、ゲーム、教育など）に特化させることができます。

### 承認ラインの調整

`scripts/watch_ideas.sh` の以下の部分を変更：

```bash
case "$status" in
    "APPROVED")        # 40点以上
    "NEEDS_IMPROVEMENT")  # 25-39点
    "REJECTED")        # 24点以下
```

## 📈 実行例

```bash
$ bash scripts/start_idea_system.sh
=== アイデア評価システム起動 ===
[Starting] Proposer AI を起動中...
[Starting] Reviewer AI を起動中...
[Starting] Watcher を起動中...

=== システム起動完了 ===

📋 セッション一覧:
  - proposer      : 提案AI（アイデア生成）
  - reviewer      : 審査AI（評価・フィードバック）
  - idea-watcher  : ワークフロー管理

# Watcherのログ例
[Workflow] 新しいアイデアの生成を要求...
[Event] アイデアファイルが更新されました
[Workflow] アイデアの審査を要求...
[Event] レビューファイルが更新されました
[Review] 判定: NEEDS_IMPROVEMENT (32点)
[Workflow] 改善フィードバックを送信...
[Event] アイデアファイルが更新されました
[Workflow] アイデアの審査を要求...
[Event] レビューファイルが更新されました
[Review] 判定: APPROVED (43点)
[Workflow] アイデアを承認して保存...
[Success] 承認: ideas/approved/idea_20241122_140530_1732276845.json
[Workflow] 新しいアイデアの生成を要求...
```

## 🛠️ トラブルシューティング

### AIが応答しない

```bash
# セッションの状態を確認
tmux list-sessions

# セッションを再起動
bash scripts/stop_idea_system.sh
bash scripts/start_idea_system.sh
```

### ファイルが生成されない

提案AIまたは審査AIがWriteツールを使っているか確認してください：
```bash
tmux attach -t proposer  # または reviewer
```

### Watcherが動作しない

fswatch がインストールされているか確認：
```bash
which fswatch
# インストールされていない場合
brew install fswatch
```

## 📝 注意事項

- 初回起動時は、AIの応答を待つため数秒かかります
- アイデアの生成と評価は自動で繰り返されます
- 無限ループを避けるため、適宜システムを停止してください
- 評価は厳格な基準で行われるため、最初は却下されることが多いです

## 🎯 活用例

1. **アイデアストック作成**: 一晩動かして複数のアイデアを収集
2. **既存アイデアの改善**: 手動でidea.jsonを編集して評価を受ける
3. **評価基準の調整**: reviewer/CLAUDE.mdを編集して自社基準に合わせる

## 📜 ライセンス

このシステムは実験的プロジェクトです。自由にカスタマイズしてご利用ください。
