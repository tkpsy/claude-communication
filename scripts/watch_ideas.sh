#!/bin/bash

# アイデア評価システムのワークフロー管理スクリプト

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
IDEAS_DIR="$PROJECT_DIR/ideas"
PROPOSALS_DIR="$IDEAS_DIR/proposals"
REVIEWS_DIR="$IDEAS_DIR/reviews"
APPROVED_DIR="$IDEAS_DIR/approved"
REJECTED_DIR="$IDEAS_DIR/rejected"
STATE_FILE="$IDEAS_DIR/state.json"

IDEA_FILE="$PROPOSALS_DIR/idea.json"
REVIEW_FILE="$REVIEWS_DIR/review.json"

echo "=== アイデア評価システム起動 ==="
echo "監視ディレクトリ: $IDEAS_DIR"

# tmux セッションが存在するか確認
check_session() {
    tmux has-session -t "$1" 2>/dev/null
}

# tmux にメッセージを送信
send_to_tmux() {
    local session=$1
    local message=$2
    tmux send-keys -t "$session" -l "$message"
    tmux send-keys -t "$session" Enter
}

# 提案AIに最初のアイデアを生成させる
request_new_idea() {
    echo "[Workflow] 新しいアイデアの生成を要求..."
    if check_session "proposer"; then
        send_to_tmux "proposer" "新しいアプリ開発のアイデアを考えて、../ideas/proposals/idea.json に書き込んでください。"
    else
        echo "[Error] proposer セッションが見つかりません"
    fi
}

# 審査AIに評価を依頼
request_review() {
    echo "[Workflow] アイデアの審査を要求..."
    if check_session "reviewer"; then
        send_to_tmux "reviewer" "../ideas/proposals/idea.json のアイデアを評価して、../ideas/reviews/review.json に結果を書き込んでください。"
    else
        echo "[Error] reviewer セッションが見つかりません"
    fi
}

# 改善フィードバックを送る
request_improvement() {
    local review_file=$1
    echo "[Workflow] 改善フィードバックを送信..."

    if [ ! -f "$review_file" ]; then
        echo "[Error] レビューファイルが見つかりません"
        return
    fi

    local feedback=$(jq -r '.feedback.suggestions | join("\n- ")' "$review_file")
    local strengths=$(jq -r '.feedback.strengths | join("\n- ")' "$review_file")
    local weaknesses=$(jq -r '.feedback.weaknesses | join("\n- ")' "$review_file")
    local score=$(jq -r '.total_score' "$review_file")

    local message="審査結果: ${score}点/50点

【強み】
- $strengths

【弱み】
- $weaknesses

【改善提案】
- $feedback

これらのフィードバックを元に、アイデアを改善して ../ideas/proposals/idea.json を更新してください。"

    if check_session "proposer"; then
        send_to_tmux "proposer" "$message"
    fi
}

# アイデアを承認して保存
approve_idea() {
    local idea_file=$1
    echo "[Workflow] アイデアを承認して保存..."

    if [ ! -f "$idea_file" ]; then
        echo "[Error] アイデアファイルが見つかりません"
        return
    fi

    local idea_id=$(jq -r '.id' "$idea_file")
    local timestamp=$(date +%s)
    local approved_file="$APPROVED_DIR/${idea_id}_${timestamp}.json"

    cp "$idea_file" "$approved_file"
    echo "[Success] 承認: $approved_file"

    # 承認カウントを更新
    local approved_count=$(jq -r '.approved_count' "$STATE_FILE")
    approved_count=$((approved_count + 1))
    jq ".approved_count = $approved_count | .status = \"approved\"" "$STATE_FILE" > "$STATE_FILE.tmp"
    mv "$STATE_FILE.tmp" "$STATE_FILE"

    # 提案と審査をクリア
    rm -f "$idea_file" "$REVIEW_FILE"

    # 次のアイデアを要求
    sleep 2
    request_new_idea
}

# アイデアを却下
reject_idea() {
    local idea_file=$1
    echo "[Workflow] アイデアを却下..."

    if [ ! -f "$idea_file" ]; then
        echo "[Error] アイデアファイルが見つかりません"
        return
    fi

    local idea_id=$(jq -r '.id' "$idea_file")
    local timestamp=$(date +%s)
    local rejected_file="$REJECTED_DIR/${idea_id}_${timestamp}.json"

    cp "$idea_file" "$rejected_file"
    echo "[Rejected] 却下: $rejected_file"

    # 却下カウントを更新
    local rejected_count=$(jq -r '.rejected_count' "$STATE_FILE")
    rejected_count=$((rejected_count + 1))
    jq ".rejected_count = $rejected_count | .status = \"rejected\"" "$STATE_FILE" > "$STATE_FILE.tmp"
    mv "$STATE_FILE.tmp" "$STATE_FILE"

    # 提案と審査をクリア
    rm -f "$idea_file" "$REVIEW_FILE"

    # 新しいアイデアを要求
    sleep 2
    if check_session "proposer"; then
        send_to_tmux "proposer" "前のアイデアは却下されました。全く新しいアプローチで別のアプリ開発アイデアを考えて、../ideas/proposals/idea.json に書き込んでください。"
    fi
}

# アイデアファイルの変更を処理
handle_idea_change() {
    echo ""
    echo "[Event] アイデアファイルが更新されました"

    if [ ! -f "$IDEA_FILE" ]; then
        echo "[Info] アイデアファイルが削除されました"
        return
    fi

    # アイデアが提出されたら審査を開始
    sleep 1
    request_review
}

# レビューファイルの変更を処理
handle_review_change() {
    echo ""
    echo "[Event] レビューファイルが更新されました"

    if [ ! -f "$REVIEW_FILE" ]; then
        echo "[Info] レビューファイルが削除されました"
        return
    fi

    local status=$(jq -r '.status' "$REVIEW_FILE")
    local score=$(jq -r '.total_score' "$REVIEW_FILE")

    echo "[Review] 判定: $status ($score点)"

    case "$status" in
        "APPROVED")
            approve_idea "$IDEA_FILE"
            ;;
        "NEEDS_IMPROVEMENT")
            request_improvement "$REVIEW_FILE"
            ;;
        "REJECTED")
            reject_idea "$IDEA_FILE"
            ;;
        *)
            echo "[Error] 不明なステータス: $status"
            ;;
    esac
}

# 初回起動時の処理
if [ ! -f "$IDEA_FILE" ]; then
    echo "[Init] システムを初期化しています..."
    sleep 2
    request_new_idea
fi

# fswatch でファイルの変更を監視
echo ""
echo "=== 監視開始 ==="
echo "Ctrl+C で終了"
echo ""

fswatch -0 "$PROPOSALS_DIR" "$REVIEWS_DIR" | while read -d "" event; do
    if [[ "$event" == *"idea.json"* ]]; then
        handle_idea_change
    elif [[ "$event" == *"review.json"* ]]; then
        handle_review_change
    fi
done
