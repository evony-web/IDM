import { NextResponse } from 'next/server';

// Support Railway URLs or fallback to localhost
const WHATSAPP_BOT_URL = process.env.WHATSAPP_BOT_URL || 'http://localhost:6002';
const DISCORD_BOT_URL = process.env.DISCORD_BOT_URL || 'http://localhost:6003';

// In Vercel/serverless, we can't spawn processes - bots must run on Railway
const isServerless = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

// GET - Check bot status by pinging health endpoints
export async function GET() {
  const results = {
    whatsapp: { running: false, url: WHATSAPP_BOT_URL },
    discord: { running: false, url: DISCORD_BOT_URL },
  };

  // Check WhatsApp bot
  try {
    const waRes = await fetch(`${WHATSAPP_BOT_URL}/api/whatsapp/health`, {
      signal: AbortSignal.timeout(10000),
    });
    if (waRes.ok) {
      results.whatsapp.running = true;
    }
  } catch {
    results.whatsapp.running = false;
  }

  // Check Discord bot
  try {
    const dcRes = await fetch(`${DISCORD_BOT_URL}/api/discord/health`, {
      signal: AbortSignal.timeout(10000),
    });
    if (dcRes.ok) {
      results.discord.running = true;
    }
  } catch {
    results.discord.running = false;
  }

  return NextResponse.json(results);
}

// DELETE - Stop/kill bots (calls Railway bot API)
export async function DELETE(request: Request) {
  try {
    // In serverless, we can only request the bot to stop via API
    if (isServerless) {
      return NextResponse.json({
        success: false,
        message: 'In serverless mode, bots must be managed via Railway dashboard',
        hint: 'Use Railway dashboard to restart/stop bot services',
      }, { status: 400 });
    }

    const body = await request.json();
    const { bot } = body as { bot: 'whatsapp' | 'discord' | 'all' };

    const results: Record<string, { success: boolean; message: string }> = {};

    const stopBot = async (botType: 'whatsapp' | 'discord') => {
      const botUrl = botType === 'whatsapp' ? WHATSAPP_BOT_URL : DISCORD_BOT_URL;
      try {
        const res = await fetch(`${botUrl}/api/${botType}/stop`, {
          method: 'POST',
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          return { success: true, message: 'Stop command sent' };
        }
        return { success: false, message: `HTTP ${res.status}` };
      } catch (err) {
        return { success: false, message: `Error: ${err instanceof Error ? err.message : 'Unknown'}` };
      }
    };

    if (bot === 'whatsapp' || bot === 'all') {
      results.whatsapp = await stopBot('whatsapp');
    }

    if (bot === 'discord' || bot === 'all') {
      results.discord = await stopBot('discord');
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST - Start or restart bots (calls Railway bot API)
export async function POST(request: Request) {
  try {
    // In serverless, we can only request the bot to restart via API
    if (isServerless) {
      const body = await request.json();
      const { bot } = body as { bot: 'whatsapp' | 'discord' | 'all' };

      const results: Record<string, { success: boolean; message: string }> = {};

      const restartBot = async (botType: 'whatsapp' | 'discord') => {
        const botUrl = botType === 'whatsapp' ? WHATSAPP_BOT_URL : DISCORD_BOT_URL;
        try {
          const res = await fetch(`${botUrl}/api/${botType}/restart`, {
            method: 'POST',
            signal: AbortSignal.timeout(10000),
          });
          if (res.ok) {
            return { success: true, message: 'Restart command sent' };
          }
          return { success: false, message: `HTTP ${res.status}` };
        } catch (err) {
          return { success: false, message: `Error: ${err instanceof Error ? err.message : 'Unknown'}` };
        }
      };

      if (bot === 'whatsapp' || bot === 'all') {
        results.whatsapp = await restartBot('whatsapp');
      }

      if (bot === 'discord' || bot === 'all') {
        results.discord = await restartBot('discord');
      }

      return NextResponse.json({
        success: true,
        results,
        timestamp: new Date().toISOString(),
        note: 'Bots run on Railway - restart commands sent to bot APIs',
      });
    }

    // Local development mode (original spawn logic)
    const body = await request.json();
    const { bot, restart } = body as { bot: 'whatsapp' | 'discord' | 'all'; restart?: boolean };

    return NextResponse.json({
      success: false,
      message: 'Local bot management requires spawn capability',
      hint: 'Use local development server for bot management',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
