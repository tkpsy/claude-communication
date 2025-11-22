import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PROJECT_DIR = path.join(process.cwd(), '..');
const IDEAS_DIR = path.join(PROJECT_DIR, 'ideas');
const APPROVED_DIR = path.join(IDEAS_DIR, 'approved');
const REJECTED_DIR = path.join(IDEAS_DIR, 'rejected');
const PROPOSALS_DIR = path.join(IDEAS_DIR, 'proposals');
const REVIEWS_DIR = path.join(IDEAS_DIR, 'reviews');
const STATE_FILE = path.join(IDEAS_DIR, 'state.json');

interface Idea {
  id: string;
  title: string;
  tagline?: string;
  category?: string;
  pain_point?: any;
  solution?: any;
  monetization?: any;
  tech_feasibility?: any;
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

function readIdeasFromDir(dirPath: string): Array<{idea: Idea, review?: Review, status: string}> {
  if (!fs.existsSync(dirPath)) return [];

  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
  const ideas: Array<{idea: Idea, review?: Review, status: string}> = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(dirPath, file), 'utf-8');
      const idea = JSON.parse(content) as Idea;

      // 対応するreviewを探す
      let review: Review | undefined;
      const reviewFile = path.join(REVIEWS_DIR, `${idea.id}.json`);
      if (fs.existsSync(reviewFile)) {
        review = JSON.parse(fs.readFileSync(reviewFile, 'utf-8'));
      }

      const status = dirPath.includes('approved') ? 'approved' :
                     dirPath.includes('rejected') ? 'rejected' : 'reviewing';

      ideas.push({ idea, review, status });
    } catch (error) {
      console.error(`Error reading ${file}:`, error);
    }
  }

  return ideas;
}

function getCurrentIdea(): {idea: Idea | null, review: Review | null} {
  const ideaFile = path.join(PROPOSALS_DIR, 'idea.json');
  const reviewFile = path.join(REVIEWS_DIR, 'review.json');

  let idea: Idea | null = null;
  let review: Review | null = null;

  if (fs.existsSync(ideaFile)) {
    idea = JSON.parse(fs.readFileSync(ideaFile, 'utf-8'));
  }

  if (fs.existsSync(reviewFile)) {
    review = JSON.parse(fs.readFileSync(reviewFile, 'utf-8'));
  }

  return { idea, review };
}

export async function GET() {
  try {
    // 各ディレクトリからアイデアを読み込む
    const approvedIdeas = readIdeasFromDir(APPROVED_DIR);
    const rejectedIdeas = readIdeasFromDir(REJECTED_DIR);
    const { idea: currentIdea, review: currentReview } = getCurrentIdea();

    // 状態ファイルを読み込む
    let state = {
      current_idea_id: null,
      iteration_count: 0,
      status: 'idle',
      approved_count: 0,
      rejected_count: 0
    };

    if (fs.existsSync(STATE_FILE)) {
      state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    }

    // 統計情報を計算
    const stats = {
      total: approvedIdeas.length + rejectedIdeas.length + (currentIdea ? 1 : 0),
      approved: approvedIdeas.length,
      rejected: rejectedIdeas.length,
      reviewing: currentIdea ? 1 : 0,
      averageScore: 0,
      approvalRate: 0
    };

    // 平均スコアを計算
    const allReviews = [
      ...approvedIdeas.filter(i => i.review).map(i => i.review!),
      ...rejectedIdeas.filter(i => i.review).map(i => i.review!)
    ];

    if (allReviews.length > 0) {
      stats.averageScore = Math.round(
        allReviews.reduce((sum, r) => sum + r.total_score, 0) / allReviews.length
      );
    }

    // 承認率を計算
    if (stats.total > 0) {
      stats.approvalRate = Math.round((stats.approved / stats.total) * 100);
    }

    return NextResponse.json({
      stats,
      state,
      current: currentIdea ? {
        idea: currentIdea,
        review: currentReview,
        status: currentReview ? 'reviewed' : 'reviewing'
      } : null,
      approved: approvedIdeas.sort((a, b) =>
        new Date(b.idea.created_at).getTime() - new Date(a.idea.created_at).getTime()
      ),
      rejected: rejectedIdeas.sort((a, b) =>
        new Date(b.idea.created_at).getTime() - new Date(a.idea.created_at).getTime()
      )
    });
  } catch (error) {
    console.error('Error fetching ideas:', error);
    return NextResponse.json({ error: 'Failed to fetch ideas' }, { status: 500 });
  }
}
