import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import { createHash } from 'crypto';

/** Hash a PIN string with SHA-256 */
function hashPin(pin: string): string {
  return createHash('sha256').update(pin).digest('hex');
}

/**
 * Normalize Indonesian phone number to local format (08xxxxxxxxxx)
 * Handles: +6281xxx → 081xxx, 6281xxx → 081xxx, 081xxx → 081xxx
 */
function normalizePhone(phone: string): string {
  let p = phone.trim().replace(/[\s\-()]/g, '');
  if (p.startsWith('+62')) {
    p = '0' + p.slice(3);
  } else if (p.startsWith('62') && p.length >= 10) {
    p = '0' + p.slice(2);
  } else if (/^[1-9]/.test(p)) {
    p = '0' + p;
  }
  return p;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'player-credentials',
      name: 'Player Login',
      credentials: {
        phone: { label: 'Phone', type: 'text' },
        pin: { label: 'PIN', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.pin) {
          throw new Error('Nomor HP dan PIN wajib diisi');
        }

        const phone = normalizePhone(credentials.phone);
        const pin = credentials.pin;

        // Find user by phone (exact match on normalized number)
        let user = await db.user.findFirst({
          where: {
            phone,
            isAdmin: false,
          },
        });

        // Fallback: try matching by normalizing all stored phones in JS
        // This handles users stored with +62 format before normalization was added
        if (!user) {
          const allPlayerUsers = await db.user.findMany({
            where: { isAdmin: false, phone: { not: null } },
          });
          user = allPlayerUsers.find(u => {
            if (!u.phone) return false;
            return normalizePhone(u.phone) === phone;
          }) || null;

          // If found via fallback, fix the stored phone format
          if (user && user.phone !== phone) {
            await db.user.update({
              where: { id: user.id },
              data: { phone },
            });
          }
        }

        if (!user) {
          throw new Error('Nomor HP tidak terdaftar');
        }

        if (!user.playerPin) {
          throw new Error('Akun belum memiliki PIN. Silakan daftar terlebih dahulu.');
        }

        // Verify PIN
        const hashedPin = hashPin(pin);
        if (hashedPin !== user.playerPin) {
          throw new Error('PIN salah');
        }

        // Return user object — will be encoded into JWT
        return {
          id: user.id,
          name: user.name,
          phone: user.phone || '',
          gender: user.gender,
          tier: user.tier,
          points: user.points,
          avatar: user.avatar,
          eloRating: user.eloRating,
          eloTier: user.eloTier,
          clubId: user.clubId,
        };
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    // Session expires in 7 days
    maxAge: 7 * 24 * 60 * 60,
  },

  jwt: {
    // JWT secret from env
    secret: process.env.NEXTAUTH_SECRET,
  },

  cookies: {
    sessionToken: {
      name: `idm_session_token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // On sign in — embed user data into JWT
      if (user) {
        token.id = user.id;
        token.phone = user.phone || '';
        token.gender = (user as any).gender || 'male';
        token.tier = (user as any).tier || 'B';
        token.points = (user as any).points ?? 0;
        token.avatar = user.avatar || '';
        token.eloRating = (user as any).eloRating ?? 1000;
        token.eloTier = (user as any).eloTier || 'Bronze';
        token.clubId = (user as any).clubId ?? null;
      }

      // On session update (e.g., profile refresh) — re-fetch user data from DB
      if (trigger === 'update') {
        try {
          const freshUser = await db.user.findUnique({
            where: { id: token.id as string },
          });
          if (freshUser) {
            token.points = freshUser.points;
            token.tier = freshUser.tier;
            token.avatar = freshUser.avatar || '';
            token.eloRating = freshUser.eloRating;
            token.eloTier = freshUser.eloTier;
            token.clubId = freshUser.clubId;
            token.name = freshUser.name;
          }
        } catch {
          // If DB fetch fails, keep existing token data
        }
      }

      return token;
    },

    async session({ session, token }) {
      // Expose JWT data to client session
      if (session.user) {
        session.user.id = token.id as string;
        session.user.phone = token.phone as string;
        session.user.gender = token.gender as string;
        session.user.tier = token.tier as string;
        session.user.points = token.points as number;
        session.user.avatar = token.avatar as string | null;
        session.user.eloRating = token.eloRating as number;
        session.user.eloTier = token.eloTier as string;
        session.user.clubId = token.clubId as string | null;
      }
      return session;
    },
  },

  pages: {
    // We don't use NextAuth's built-in pages — we handle auth in our own modals
    signIn: '/',
    error: '/',
  },

  // Don't expose the raw error to the client
  debug: process.env.NODE_ENV === 'development',
};

// Extended session type
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name: string;
      phone: string;
      gender: string;
      tier: string;
      points: number;
      avatar: string | null;
      eloRating: number;
      eloTier: string;
      clubId: string | null;
    };
  }

  interface User {
    phone: string;
    gender: string;
    tier: string;
    points: number;
    avatar: string | null;
    eloRating: number;
    eloTier: string;
    clubId: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    phone: string;
    gender: string;
    tier: string;
    points: number;
    avatar: string | null;
    eloRating: number;
    eloTier: string;
    clubId: string | null;
  }
}
