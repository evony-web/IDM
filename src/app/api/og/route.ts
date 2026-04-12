import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_LOGO_URL } from '@/lib/server-utils';

const BASE_URL = process.env.NEXTAUTH_URL || 'https://idm-tournament.netlify.app';
const LOGO_URL = DEFAULT_LOGO_URL;

// Color palette
const COLORS = {
  bgTop: '#050507',
  bgBottom: '#0B0B0F',
  accent: '#73FF00',
  blue: '#38BDF8',
  gold: '#FFD700',
  green: '#22C55E',
  white: '#ffffff',
  white85: 'rgba(255,255,255,0.85)',
  white60: 'rgba(255,255,255,0.60)',
  white35: 'rgba(255,255,255,0.35)',
  white20: 'rgba(255,255,255,0.20)',
  white10: 'rgba(255,255,255,0.10)',
  greenAlpha: 'rgba(115,255,0,0.15)',
  blueAlpha: 'rgba(56,189,248,0.15)',
  goldAlpha: 'rgba(255,215,0,0.15)',
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function svgWrap(content: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${COLORS.bgTop}" />
      <stop offset="100%" stop-color="${COLORS.bgBottom}" />
    </linearGradient>
    <linearGradient id="accentLine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="transparent" />
      <stop offset="50%" stop-color="${COLORS.accent}" stop-opacity="0.3" />
      <stop offset="100%" stop-color="transparent" />
    </linearGradient>
    <linearGradient id="goldLine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="transparent" />
      <stop offset="50%" stop-color="${COLORS.gold}" stop-opacity="0.3" />
      <stop offset="100%" stop-color="transparent" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bgGrad)" />

  <!-- Top accent line -->
  <rect x="0" y="0" width="1200" height="3" fill="url(#accentLine)" />

  <!-- Bottom accent line -->
  <rect x="0" y="627" width="1200" height="3" fill="url(#goldLine)" />

  <!-- IDM Logo -->
  <image href="${LOGO_URL}" x="40" y="28" width="48" height="48" />

  <!-- Branding -->
  <text x="100" y="50" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="800" fill="${COLORS.white85}">IDOL META</text>
  <text x="100" y="68" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="500" fill="${COLORS.white35}" letter-spacing="2">TARKAM FAN MADE EDITION</text>

  ${content}

  <!-- Footer -->
  <rect x="0" y="588" width="1200" height="42" fill="rgba(0,0,0,0.3)" />
  <text x="600" y="614" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="500" fill="${COLORS.white20}" text-anchor="middle" letter-spacing="1">idolmeta.vercel.app</text>
</svg>`;
}

function defaultOg(): string {
  const centerContent = `
  <!-- Trophy icon area -->
  <circle cx="600" cy="250" r="60" fill="${COLORS.goldAlpha}" />
  <text x="600" y="270" font-size="48" text-anchor="middle">🏆</text>

  <!-- Title -->
  <text x="600" y="360" font-family="system-ui, -apple-system, sans-serif" font-size="38" font-weight="800" fill="${COLORS.white}" text-anchor="middle">IDOL META</text>
  <text x="600" y="395" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="500" fill="${COLORS.accent}" text-anchor="middle" letter-spacing="3">TARKAM FAN MADE EDITION</text>

  <!-- Tagline -->
  <text x="600" y="440" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="400" fill="${COLORS.white35}" text-anchor="middle">Premium Esports Tournament Platform</text>

  <!-- Decorative dots -->
  <circle cx="520" cy="480" r="2" fill="${COLORS.accent}" opacity="0.5" />
  <circle cx="540" cy="480" r="2" fill="${COLORS.accent}" opacity="0.3" />
  <circle cx="560" cy="480" r="2" fill="${COLORS.accent}" opacity="0.5" />
  <circle cx="640" cy="480" r="2" fill="${COLORS.blue}" opacity="0.3" />
  <circle cx="660" cy="480" r="2" fill="${COLORS.blue}" opacity="0.5" />
  <circle cx="680" cy="480" r="2" fill="${COLORS.blue}" opacity="0.3" />
`;
  return svgWrap(centerContent);
}

function matchOg(params: URLSearchParams): string {
  const teamA = escapeXml(params.get('teamA') || 'Team A');
  const teamB = escapeXml(params.get('teamB') || 'Team B');
  const scoreA = params.get('scoreA') || '0';
  const scoreB = params.get('scoreB') || '0';
  const winner = escapeXml(params.get('winner') || '');
  const tournament = escapeXml(params.get('tournament') || 'Tournament');
  const round = escapeXml(params.get('round') || '');

  const teamAWon = parseInt(scoreA) > parseInt(scoreB);
  const teamBWon = parseInt(scoreB) > parseInt(scoreA);
  const draw = parseInt(scoreA) === parseInt(scoreB);

  const teamAColor = teamAWon ? COLORS.accent : COLORS.white60;
  const teamBColor = teamBWon ? COLORS.blue : COLORS.white60;
  const scoreAColor = teamAWon ? COLORS.accent : COLORS.white35;
  const scoreBColor = teamBWon ? COLORS.blue : COLORS.white35;

  const centerContent = `
  <!-- Tournament label -->
  <rect x="440" y="110" width="320" height="30" rx="15" fill="${COLORS.greenAlpha}" />
  <text x="600" y="130" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" fill="${COLORS.accent}" text-anchor="middle" letter-spacing="2">${tournament.toUpperCase()}</text>

  ${round ? `
  <text x="600" y="165" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="500" fill="${COLORS.white35}" text-anchor="middle">${escapeXml(round)}</text>
  ` : ''}

  <!-- VS Circle -->
  <circle cx="600" cy="290" r="40" fill="${COLORS.white10}" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
  <text x="600" y="298" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="900" fill="${COLORS.white35}" text-anchor="middle">VS</text>

  <!-- Team A -->
  <text x="380" y="280" font-family="system-ui, -apple-system, sans-serif" font-size="32" font-weight="800" fill="${teamAColor}" text-anchor="end">${teamA}</text>

  <!-- Score A -->
  <text x="480" y="298" font-family="system-ui, -apple-system, sans-serif" font-size="48" font-weight="900" fill="${scoreAColor}" text-anchor="end">${scoreA}</text>

  <!-- Separator -->
  <text x="555" y="298" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="300" fill="${COLORS.white20}" text-anchor="middle">-</text>

  <!-- Score B -->
  <text x="720" y="298" font-family="system-ui, -apple-system, sans-serif" font-size="48" font-weight="900" fill="${scoreBColor}" text-anchor="start">${scoreB}</text>

  <!-- Team B -->
  <text x="820" y="280" font-family="system-ui, -apple-system, sans-serif" font-size="32" font-weight="800" fill="${teamBColor}" text-anchor="start">${teamB}</text>

  ${teamAWon ? `<rect x="475" y="268" width="4" height="40" rx="2" fill="${COLORS.accent}" opacity="0.6" />` : ''}
  ${teamBWon ? `<rect x="721" y="268" width="4" height="40" rx="2" fill="${COLORS.blue}" opacity="0.6" />` : ''}

  <!-- Winner announcement -->
  ${winner ? `
  <rect x="400" y="370" width="400" height="40" rx="20" fill="${COLORS.goldAlpha}" />
  <text x="600" y="396" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" fill="${COLORS.gold}" text-anchor="middle">🏆 ${winner} MENANG!</text>
  ` : ''}

  <!-- Bottom accent -->
  <rect x="300" y="440" width="600" height="1" fill="url(#accentLine)" />

  <text x="600" y="475" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="400" fill="${COLORS.white20}" text-anchor="middle">MATCH RESULT</text>
`;
  return svgWrap(centerContent);
}

function tournamentOg(params: URLSearchParams): string {
  const name = escapeXml(params.get('name') || 'Tournament');
  const status = escapeXml(params.get('status') || 'Upcoming');
  const week = params.get('week') || '';
  const prizePool = params.get('prizePool') || '';
  const participants = params.get('participants') || '';

  const statusColor = status === 'live' || status === 'ongoing' ? COLORS.green
    : status === 'completed' || status === 'finished' ? COLORS.accent
    : COLORS.blue;

  const statusBg = status === 'live' || status === 'ongoing' ? 'rgba(34,197,94,0.12)'
    : status === 'completed' || status === 'finished' ? COLORS.greenAlpha
    : COLORS.blueAlpha;

  const centerContent = `
  <!-- Tournament icon -->
  <circle cx="600" cy="200" r="55" fill="${COLORS.goldAlpha}" />
  <text x="600" y="218" font-size="44" text-anchor="middle">⚔️</text>

  <!-- Status badge -->
  <rect x="515" y="275" width="170" height="28" rx="14" fill="${statusBg}" />
  <text x="600" y="294" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700" fill="${statusColor}" text-anchor="middle" letter-spacing="2">${status.toUpperCase()}</text>

  <!-- Tournament name -->
  <text x="600" y="345" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="800" fill="${COLORS.white}" text-anchor="middle">${name}</text>

  ${week ? `
  <text x="600" y="378" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="500" fill="${COLORS.white35}" text-anchor="middle">Week ${escapeXml(week)}</text>
  ` : ''}

  <!-- Stats row -->
  <rect x="280" y="410" width="200" height="60" rx="16" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
  <text x="380" y="438" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="500" fill="${COLORS.white35}" text-anchor="middle">PRIZE POOL</text>
  <text x="380" y="460" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="800" fill="${COLORS.gold}" text-anchor="middle">${prizePool ? `Rp ${escapeXml(prizePool)}` : '—'}</text>

  <rect x="520" y="410" width="200" height="60" rx="16" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
  <text x="620" y="438" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="500" fill="${COLORS.white35}" text-anchor="middle">PARTICIPANTS</text>
  <text x="620" y="460" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="800" fill="${COLORS.accent}" text-anchor="middle">${participants || '—'}</text>

  <rect x="760" y="410" width="120" height="60" rx="16" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
  <text x="820" y="438" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="500" fill="${COLORS.white35}" text-anchor="middle">WEEK</text>
  <text x="820" y="460" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="800" fill="${COLORS.blue}" text-anchor="middle">${week || '—'}</text>

  <text x="600" y="520" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="400" fill="${COLORS.white20}" text-anchor="middle">TOURNAMENT INFO</text>
`;
  return svgWrap(centerContent);
}

function playerOg(params: URLSearchParams): string {
  const name = escapeXml(params.get('name') || 'Player');
  const points = params.get('points') || '0';
  const tier = escapeXml(params.get('tier') || 'Unranked');
  const rank = params.get('rank') || '-';
  const isMVP = params.get('isMVP') === 'true';

  const centerContent = `
  <!-- Player icon -->
  <circle cx="600" cy="210" r="55" fill="${COLORS.greenAlpha}" />
  <text x="600" y="228" font-size="44" text-anchor="middle">${isMVP ? '👑' : '🎮'}</text>

  ${isMVP ? `
  <!-- MVP Badge -->
  <rect x="620" y="168" width="60" height="24" rx="12" fill="${COLORS.goldAlpha}" />
  <text x="650" y="185" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="800" fill="${COLORS.gold}" text-anchor="middle" letter-spacing="1">MVP</text>
  ` : ''}

  <!-- Player name -->
  <text x="600" y="310" font-family="system-ui, -apple-system, sans-serif" font-size="38" font-weight="800" fill="${COLORS.white}" text-anchor="middle">${name}</text>

  <!-- Tier badge -->
  <rect x="510" y="325" width="180" height="28" rx="14" fill="${COLORS.blueAlpha}" />
  <text x="600" y="344" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" fill="${COLORS.blue}" text-anchor="middle" letter-spacing="2">${tier.toUpperCase()}</text>

  <!-- Stats row -->
  <rect x="350" y="380" width="200" height="70" rx="16" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
  <text x="450" y="412" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="500" fill="${COLORS.white35}" text-anchor="middle">RANK</text>
  <text x="450" y="438" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="900" fill="${COLORS.accent}" text-anchor="middle">#${escapeXml(rank)}</text>

  <rect x="590" y="380" width="200" height="70" rx="16" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
  <text x="690" y="412" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="500" fill="${COLORS.white35}" text-anchor="middle">POINTS</text>
  <text x="690" y="438" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="900" fill="${COLORS.gold}" text-anchor="middle">${escapeXml(points)}</text>

  <text x="600" y="500" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="400" fill="${COLORS.white20}" text-anchor="middle">PLAYER PROFILE</text>
`;
  return svgWrap(centerContent);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || '';

  let svg: string;

  switch (type) {
    case 'match':
      svg = matchOg(searchParams);
      break;
    case 'tournament':
      svg = tournamentOg(searchParams);
      break;
    case 'player':
      svg = playerOg(searchParams);
      break;
    default:
      svg = defaultOg();
  }

  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Content-Length': String(Buffer.byteLength(svg, 'utf-8')),
    },
  });
}
