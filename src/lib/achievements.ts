/**
 * Achievement definitions and types for the IDM Tournament Platform.
 *
 * Each achievement has a unique type key used for lookup, display metadata,
 * and an associated checking function that determines if a user qualifies.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AchievementDefinition {
  type: string;
  name: string;
  description: string;
  icon: string;
  category: 'match' | 'tournament' | 'mvp' | 'streak' | 'veteran' | 'points' | 'social' | 'ranking';
}

export interface AchievementRecord {
  id: string;
  userId: string;
  type: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: Date;
}

// ─── Definitions ─────────────────────────────────────────────────────────────

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    type: 'first_win',
    name: 'First Win',
    description: 'Menangkan pertandingan pertama',
    icon: '🏆',
    category: 'match',
  },
  {
    type: 'champion',
    name: 'Champion',
    description: 'Juara turnamen',
    icon: '👑',
    category: 'tournament',
  },
  {
    type: 'runner_up',
    name: 'Runner Up',
    description: 'Juara 2 turnamen',
    icon: '🥈',
    category: 'tournament',
  },
  {
    type: 'third_place',
    name: 'Third Place',
    description: 'Juara 3 turnamen',
    icon: '🥉',
    category: 'tournament',
  },
  {
    type: 'mvp_first',
    name: 'First MVP',
    description: 'Mendapat MVP pertama',
    icon: '⭐',
    category: 'mvp',
  },
  {
    type: 'mvp_3x',
    name: 'MVP x3',
    description: 'Mendapat 3 MVP',
    icon: '🌟',
    category: 'mvp',
  },
  {
    type: 'mvp_5x',
    name: 'MVP x5',
    description: 'Mendapat 5 MVP',
    icon: '💎',
    category: 'mvp',
  },
  {
    type: 'win_streak_3',
    name: 'Win Streak 3',
    description: 'Menang 3 berturut-turut',
    icon: '🔥',
    category: 'streak',
  },
  {
    type: 'win_streak_5',
    name: 'Win Streak 5',
    description: 'Menang 5 berturut-turut',
    icon: '⚡',
    category: 'streak',
  },
  {
    type: 'matches_10',
    name: 'Veteran',
    description: 'Mainkan 10 pertandingan',
    icon: '🎮',
    category: 'veteran',
  },
  {
    type: 'matches_25',
    name: 'Elite',
    description: 'Mainkan 25 pertandingan',
    icon: '🛡️',
    category: 'veteran',
  },
  {
    type: 'points_500',
    name: 'Point Collector',
    description: 'Kumpulkan 500 poin',
    icon: '💰',
    category: 'points',
  },
  {
    type: 'points_1000',
    name: 'Point Master',
    description: 'Kumpulkan 1000 poin',
    icon: '👑',
    category: 'points',
  },
  {
    type: 'club_member',
    name: 'Club Member',
    description: 'Bergabung dengan club',
    icon: '👥',
    category: 'social',
  },
  {
    type: 'top_10',
    name: 'Top 10',
    description: 'Masuk 10 besar ranking',
    icon: '📊',
    category: 'ranking',
  },
  {
    type: 'followed_5',
    name: 'Populer',
    description: 'Diikuti oleh 5 pemain',
    icon: '🌟',
    category: 'social',
  },
  {
    type: 'followed_20',
    name: 'Influencer',
    description: 'Diikuti oleh 20 pemain',
    icon: '⭐',
    category: 'social',
  },
  {
    type: 'following_5',
    name: 'Ramah',
    description: 'Mengikuti 5 pemain',
    icon: '🤝',
    category: 'social',
  },
];

/**
 * Fast lookup map: type → AchievementDefinition
 */
export const ACHIEVEMENT_MAP: Record<string, AchievementDefinition> = Object.fromEntries(
  ACHIEVEMENT_DEFINITIONS.map((a) => [a.type, a]),
);

/**
 * Categories with their display metadata
 */
export const ACHIEVEMENT_CATEGORIES = [
  { key: 'match', label: 'Pertandingan', icon: '⚔️' },
  { key: 'tournament', label: 'Turnamen', icon: '🏆' },
  { key: 'mvp', label: 'MVP', icon: '⭐' },
  { key: 'streak', label: 'Streak', icon: '🔥' },
  { key: 'veteran', label: 'Veteran', icon: '🎮' },
  { key: 'points', label: 'Poin', icon: '💰' },
  { key: 'social', label: 'Sosial', icon: '👥' },
  { key: 'ranking', label: 'Ranking', icon: '📊' },
] as const;
