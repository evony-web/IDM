import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';

// Store conversation history in memory (use Redis/database in production)
const conversations = new Map<string, Array<{ role: string; content: string }>>();

const SYSTEM_PROMPT = `You are an AI Tournament Assistant for IDOL META Tarkam - an esports tournament platform.

Your role is to help users with:
- Tournament rules and format explanations
- Player statistics and rankings queries
- Team formation suggestions based on player tiers (S/A/B)
- Match schedules and bracket information
- General tournament guidance

Tournament Rules (GR Arena 3vs3):
- Teams consist of 3 players
- Player tiers: S (Elite), A (Advanced), B (Beginner)
- Teams should be balanced across tiers
- Single elimination bracket format
- Points awarded for wins: 3 points per win

Be helpful, friendly, and concise. Respond in Indonesian when appropriate.
If you don't know something specific about current tournament data, suggest checking the tournament page.`;

export async function POST(request: NextRequest) {
  try {
    const { sessionId, message } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Initialize ZAI
    const zai = await ZAI.create();

    // Get or create conversation history
    let history = conversations.get(sessionId) || [
      { role: 'assistant', content: SYSTEM_PROMPT }
    ];

    // Fetch current tournament context
    const tournament = await db.tournament.findFirst({
      where: { status: { in: ['registration', 'ongoing'] } },
      include: {
        teams: { include: { members: { include: { user: true } } } },
        matches: { include: { teamA: true, teamB: true, winner: true } },
        registrations: { include: { user: true } }
      }
    });

    // Add context to the message
    let contextualMessage = message;
    if (tournament) {
      const topPlayers = await db.user.findMany({
        where: { isAdmin: false },
        orderBy: { points: 'desc' },
        take: 5,
        select: { name: true, points: true, tier: true }
      });

      contextualMessage = `${message}

Current Tournament Context:
- Tournament: ${tournament.name}
- Status: ${tournament.status}
- Teams: ${tournament.teams.length}
- Registered Players: ${tournament.registrations.length}
- Prize Pool: Rp ${tournament.prizePool?.toLocaleString() || 0}

Top Players:
${topPlayers.map((p, i) => `${i + 1}. ${p.name} (${p.tier}) - ${p.points} pts`).join('\n')}`;
    }

    // Add user message to history
    history.push({ role: 'user', content: contextualMessage });

    // Get AI completion
    const completion = await zai.chat.completions.create({
      messages: history as Array<{ role: 'assistant' | 'user'; content: string }>,
      thinking: { type: 'disabled' }
    });

    const aiResponse = completion.choices[0]?.message?.content || 'Maaf, saya tidak dapat memproses permintaan Anda.';

    // Add AI response to history
    history.push({ role: 'assistant', content: aiResponse });

    // Keep only last 20 messages to prevent context overflow
    if (history.length > 20) {
      history = [history[0], ...history.slice(-19)];
    }

    // Save updated history
    conversations.set(sessionId, history);

    return NextResponse.json({
      success: true,
      response: aiResponse,
      messageCount: history.length - 1
    });

  } catch (error) {
    console.error('AI Chat Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Terjadi kesalahan. Silakan coba lagi.'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (sessionId) {
    conversations.delete(sessionId);
  }

  return NextResponse.json({ success: true, message: 'Conversation cleared' });
}
