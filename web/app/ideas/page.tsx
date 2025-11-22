'use client';

import { useEffect, useState } from 'react';

interface Idea {
  id: string;
  title: string;
  tagline?: string;
  category?: string;
  pain_point?: {
    description: string;
    target_user: string;
    frequency: string;
  };
  solution?: {
    core_feature: string;
    steps_to_solve: string;
    time_saved: string;
  };
  monetization?: {
    free_features: string;
    paid_features: string;
    price: string;
  };
  tech_feasibility?: {
    dev_period: string;
    tech_stack: string[];
    backend_needed: string;
  };
  marketing?: {
    search_keywords: string[];
    tiktok_hook: string;
    share_trigger: string;
  };
  iteration: number;
  created_at: string;
  [key: string]: any;
}

interface Review {
  idea_id: string;
  scores: {
    [key: string]: number;
  };
  total_score: number;
  status: string;
  grade?: string;
  feedback: {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  };
  reviewed_at: string;
  iteration: number;
}

interface IdeaWithReview {
  idea: Idea;
  review?: Review;
  status: string;
}

interface Stats {
  total: number;
  approved: number;
  rejected: number;
  reviewing: number;
  averageScore: number;
  approvalRate: number;
}

interface State {
  current_idea_id: string | null;
  iteration_count: number;
  status: string;
  approved_count: number;
  rejected_count: number;
}

export default function IdeasPage() {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    approved: 0,
    rejected: 0,
    reviewing: 0,
    averageScore: 0,
    approvalRate: 0
  });
  const [state, setState] = useState<State | null>(null);
  const [current, setCurrent] = useState<IdeaWithReview | null>(null);
  const [approved, setApproved] = useState<IdeaWithReview[]>([]);
  const [rejected, setRejected] = useState<IdeaWithReview[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<IdeaWithReview | null>(null);
  const [activeTab, setActiveTab] = useState<'approved' | 'rejected' | 'current'>('current');

  const fetchIdeas = async () => {
    try {
      const res = await fetch('/api/ideas');
      const data = await res.json();

      setStats(data.stats);
      setState(data.state);
      setCurrent(data.current);
      setApproved(data.approved);
      setRejected(data.rejected);
    } catch (err) {
      console.error('Failed to fetch ideas:', err);
    }
  };

  useEffect(() => {
    void fetchIdeas();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      void fetchIdeas();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const getGradeBadge = (score: number) => {
    if (score >= 80) return { label: 'S', color: 'bg-green-600' };
    if (score >= 60) return { label: 'A', color: 'bg-blue-600' };
    if (score >= 40) return { label: 'B', color: 'bg-yellow-600' };
    return { label: 'C', color: 'bg-red-600' };
  };

  const ScoreBar = ({ score, maxScore = 100 }: { score: number; maxScore?: number }) => {
    const percentage = (score / maxScore) * 100;
    const colorClass = score >= 8 ? 'bg-green-500' : score >= 6 ? 'bg-yellow-500' : 'bg-red-500';

    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${colorClass} transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm font-medium w-8 text-right">{score}</span>
      </div>
    );
  };

  const IdeaCard = ({ ideaWithReview, onClick }: { ideaWithReview: IdeaWithReview; onClick: () => void }) => {
    const { idea, review, status } = ideaWithReview;
    const badge = review ? getGradeBadge(review.total_score) : null;

    return (
      <div
        onClick={onClick}
        className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-750 transition-colors border border-gray-700"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">{idea.title}</h3>
            {idea.tagline && <p className="text-sm text-gray-400 mt-1">{idea.tagline}</p>}
          </div>
          {badge && (
            <span className={`${badge.color} text-white text-xs font-bold px-2 py-1 rounded`}>
              {badge.label}
            </span>
          )}
        </div>

        {review && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-400">総合スコア</span>
              <span className="text-white font-bold">{review.total_score}/100点</span>
            </div>
            <ScoreBar score={review.total_score} maxScore={100} />
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{idea.category || 'カテゴリ未設定'}</span>
          <span>v{idea.iteration}</span>
        </div>
      </div>
    );
  };

  const IdeaDetail = ({ ideaWithReview }: { ideaWithReview: IdeaWithReview }) => {
    const { idea, review } = ideaWithReview;

    const scoreLabels: { [key: string]: string } = {
      single_function_focus: '単機能特化',
      pain_point_clarity: 'ペインポイント明確性',
      search_intent: 'ASA検索ボリューム',
      ios_native_affinity: 'iOS親和性',
      solution_speed: '解決速度',
      dev_scope_feasibility: '開発スコープ',
      tiktok_ugc_fit: 'TikTok適性',
      onboarding_monetization: '課金設計',
      viral_loop: 'シェア誘発性',
      organic_uplift: 'オーガニック期待値'
    };

    return (
      <div className="bg-gray-800 rounded-lg p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">{idea.title}</h2>
            {idea.tagline && <p className="text-gray-400 mt-1">{idea.tagline}</p>}
          </div>
          <button
            onClick={() => setSelectedIdea(null)}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {review && (
          <div className="mb-6 bg-gray-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">評価スコア</h3>
              <div className="text-right">
                <div className="text-3xl font-bold text-white">{review.total_score}</div>
                <div className="text-sm text-gray-400">/ 100点</div>
              </div>
            </div>

            <div className="space-y-3">
              {Object.entries(review.scores).map(([key, value]) => (
                <div key={key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-300">{scoreLabels[key] || key}</span>
                    <span className="text-white">{value}/10</span>
                  </div>
                  <ScoreBar score={value} maxScore={10} />
                </div>
              ))}
            </div>

            {review.feedback && (
              <div className="mt-6 space-y-4">
                {review.feedback.strengths.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-green-400 mb-2">強み</h4>
                    <ul className="space-y-1">
                      {review.feedback.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-gray-300 pl-4 border-l-2 border-green-500">
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {review.feedback.weaknesses.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-red-400 mb-2">弱み</h4>
                    <ul className="space-y-1">
                      {review.feedback.weaknesses.map((w, i) => (
                        <li key={i} className="text-sm text-gray-300 pl-4 border-l-2 border-red-500">
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {review.feedback.suggestions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-blue-400 mb-2">改善提案</h4>
                    <ul className="space-y-1">
                      {review.feedback.suggestions.map((s, i) => (
                        <li key={i} className="text-sm text-gray-300 pl-4 border-l-2 border-blue-500">
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          {idea.pain_point && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2">ペインポイント</h3>
              <p className="text-white">{idea.pain_point.description}</p>
              <div className="mt-2 text-sm text-gray-400">
                <p>ターゲット: {idea.pain_point.target_user}</p>
                <p>頻度: {idea.pain_point.frequency}</p>
              </div>
            </div>
          )}

          {idea.solution && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2">ソリューション</h3>
              <p className="text-white">{idea.solution.core_feature}</p>
              <div className="mt-2 text-sm text-gray-400">
                <p>手順: {idea.solution.steps_to_solve}</p>
                <p>時間短縮: {idea.solution.time_saved}</p>
              </div>
            </div>
          )}

          {idea.monetization && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2">収益化</h3>
              <div className="space-y-1 text-sm">
                <p className="text-white">無料: {idea.monetization.free_features}</p>
                <p className="text-white">有料: {idea.monetization.paid_features}</p>
                <p className="text-blue-400 font-semibold">{idea.monetization.price}</p>
              </div>
            </div>
          )}

          {idea.tech_feasibility && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2">技術的実現性</h3>
              <div className="space-y-1 text-sm text-white">
                <p>開発期間: {idea.tech_feasibility.dev_period}</p>
                <p>技術スタック: {idea.tech_feasibility.tech_stack.join(', ')}</p>
                <p>バックエンド: {idea.tech_feasibility.backend_needed}</p>
              </div>
            </div>
          )}

          {idea.marketing && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2">マーケティング</h3>
              <div className="space-y-1 text-sm text-white">
                <p>検索キーワード: {idea.marketing.search_keywords.join(', ')}</p>
                <p>TikTokフック: {idea.marketing.tiktok_hook}</p>
                <p>シェア誘発: {idea.marketing.share_trigger}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">AI Idea Evaluation System</h1>
            <p className="text-gray-400">2025年版モバイルユーティリティアプリ審査システム</p>
          </div>
          <a
            href="/"
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors"
          >
            ← Claude Monitor
          </a>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">合計</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
            <div className="text-sm text-green-400 mb-1">承認</div>
            <div className="text-2xl font-bold text-green-400">{stats.approved}</div>
          </div>
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
            <div className="text-sm text-red-400 mb-1">却下</div>
            <div className="text-2xl font-bold text-red-400">{stats.rejected}</div>
          </div>
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
            <div className="text-sm text-yellow-400 mb-1">審査中</div>
            <div className="text-2xl font-bold text-yellow-400">{stats.reviewing}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">平均スコア</div>
            <div className="text-2xl font-bold">{stats.averageScore}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">承認率</div>
            <div className="text-2xl font-bold">{stats.approvalRate}%</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('current')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'current'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            審査中 ({current ? 1 : 0})
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'approved'
                ? 'text-white border-b-2 border-green-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            承認済み ({approved.length})
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'rejected'
                ? 'text-white border-b-2 border-red-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            却下済み ({rejected.length})
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeTab === 'current' && current && (
            <IdeaCard
              ideaWithReview={current}
              onClick={() => setSelectedIdea(current)}
            />
          )}

          {activeTab === 'current' && !current && (
            <div className="col-span-3 text-center py-12 text-gray-500">
              現在審査中のアイデアはありません
            </div>
          )}

          {activeTab === 'approved' && approved.length === 0 && (
            <div className="col-span-3 text-center py-12 text-gray-500">
              承認されたアイデアはまだありません
            </div>
          )}

          {activeTab === 'approved' &&
            approved.map((item) => (
              <IdeaCard
                key={item.idea.id}
                ideaWithReview={item}
                onClick={() => setSelectedIdea(item)}
              />
            ))}

          {activeTab === 'rejected' && rejected.length === 0 && (
            <div className="col-span-3 text-center py-12 text-gray-500">
              却下されたアイデアはまだありません
            </div>
          )}

          {activeTab === 'rejected' &&
            rejected.map((item) => (
              <IdeaCard
                key={item.idea.id}
                ideaWithReview={item}
                onClick={() => setSelectedIdea(item)}
              />
            ))}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedIdea && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="max-w-4xl w-full">
            <IdeaDetail ideaWithReview={selectedIdea} />
          </div>
        </div>
      )}
    </div>
  );
}
