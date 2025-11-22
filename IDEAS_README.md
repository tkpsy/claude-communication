# 🚀 AI Idea Evaluation System

2025年版モバイルユーティリティアプリの提案と審査を自動化するAI対話システム

## 🎯 概要

2つのAIが協力して**個人開発で収益化可能なモバイルユーティリティアプリ**のアイデアを生み出し、洗練させていくシステムです。

- **Proposer AI（提案AI）**: iOS 18時代の単機能特化アプリアイデアを生成
- **Reviewer AI（審査AI）**: 100点満点の厳格な基準で評価・フィードバック
- **Watcher**: ワークフロー を自動管理（提案→評価→改善→承認/却下）

**特徴:**
- モバイルアプリに特化した実践的な評価基準
- 個人開発スコープを厳格にチェック
- TikTok時代のマーケティング適性を重視
- 80点以上で承認される高い合格ライン

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
   ↓ モバイルアプリアイデアを提案（proposals/idea.json）

2. Reviewer AI
   ↓ 10項目で厳格評価（reviews/review.json）

3. Watcher が判定
   ├─ 80点以上 → approved/ に保存 → 次のアイデア生成
   ├─ 60-79点 → フィードバック送信 → Proposer が改善
   ├─ 40-59点 → 厳しいフィードバック → 根本的見直し
   └─ 39点以下 → rejected/ に保存 → 新アイデア生成
```

## 📊 評価基準（100点満点）

**2025年版モバイルユーティリティアプリ評価シート**を採用

### 1. 市場性・課題の鋭さ (30点)
- 単機能特化・アンバンドリング (10点)
- ペインポイントの明確性 (10点)
- ASA検索ボリューム (10点)

### 2. 実現可能性と体験価値 (30点)
- iOS 18 / OSネイティブ親和性 (10点)
- 解決速度とシンプルさ (10点)
- 開発スコープの実現性 (10点)

### 3. マーケティング・収益化ポテンシャル (40点)
- TikTok / UGC適性 (10点)
- オンボーディング・課金設計 (10点)
- シェア誘発性 (10点)
- オーガニック・アップリフト期待値 (10点)

### 判定基準

- ✅ **即時実行 (APPROVED)**: 80点以上 - Goサイン、MVP開発開始
- 🔄 **要改善 (NEEDS_IMPROVEMENT)**: 60-79点 - 条件付きGo
- ⚠️ **保留 (NEEDS_IMPROVEMENT)**: 40-59点 - リサーチに戻る
- ❌ **却下 (REJECTED)**: 39点以下 - 収益化困難または開発難易度高すぎ

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
  "title": "QuickRemove - 背景削除アプリ",
  "tagline": "1タップで背景削除",
  "category": "写真/ビデオ",

  "pain_point": {
    "description": "インスタ投稿のために背景を削除したいが、Photoshopは複雑で時間がかかりすぎる",
    "target_user": "SNSに毎日投稿するクリエイター・インフルエンサー",
    "frequency": "毎日3-5枚の写真を加工"
  },

  "solution": {
    "core_feature": "AIによる自動背景削除（タップ1回）",
    "steps_to_solve": "1. 写真選択 2. タップ 3. 保存 - 計3タップで完了",
    "time_saved": "Photoshopの5分 → QuickRemoveで10秒（1/30の時間）"
  },

  "ios_native": {
    "widget": "ウィジェットから直接起動、カメラロールの最新写真を自動処理",
    "control_center": "コントロールセンターに配置、即座に起動",
    "shortcuts": "ショートカットで一括処理が可能"
  },

  "monetization": {
    "free_features": "1日3枚まで無料で背景削除",
    "paid_features": "無制限処理 + 高解像度出力 + 透過PNG保存",
    "price": "月額480円 または 買い切り1,200円"
  },

  "marketing": {
    "search_keywords": ["背景削除", "背景透過", "切り抜き"],
    "tiktok_hook": "ごちゃごちゃした背景の写真が1タップで綺麗に",
    "share_trigger": "処理前後のBefore/After画像を自動生成、SNSシェアボタン"
  },

  "tech_feasibility": {
    "dev_period": "3ヶ月",
    "tech_stack": ["Swift", "Core ML", "Vision API", "CloudKit"],
    "backend_needed": "不要（全てデバイス上で処理）"
  },

  "competitors": [
    {
      "name": "Remove.bg",
      "weakness": "Web版のみ、アプリ版は英語で使いづらい"
    },
    {
      "name": "Photoshop Express",
      "weakness": "高機能すぎて初心者には複雑"
    }
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
    "single_function_focus": 9,
    "pain_point_clarity": 8,
    "search_intent": 7,
    "ios_native_affinity": 9,
    "solution_speed": 8,
    "dev_scope_feasibility": 9,
    "tiktok_ugc_fit": 8,
    "onboarding_monetization": 8,
    "viral_loop": 7,
    "organic_uplift": 8
  },
  "total_score": 81,
  "status": "APPROVED",
  "grade": "S",
  "feedback": {
    "strengths": [
      "単機能特化で使いやすい",
      "個人開発で3ヶ月で完成可能",
      "iOS 18のウィジェットと相性抜群"
    ],
    "weaknesses": [
      "検索キーワードがやや弱い",
      "シェア機能の工夫が必要"
    ],
    "suggestions": [
      "ASAで狙える具体的なキーワードを追加",
      "結果画面をSNSでシェアしたくなる要素を強化"
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
