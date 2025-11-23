// src/auth.config.ts
import type { NextAuthOptions, Session, User, Account } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { AdapterUser } from "next-auth/adapters";
import type { JWT } from "next-auth/jwt";

type AppToken = JWT & {
  uid?: string;
  accessToken?: string;
};

type AppSession = Session & {
  user: NonNullable<Session["user"]> & { uid?: string };
};

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },

providers: [
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: { label: "email", type: "text" },
      password: { label: "password", type: "password" },
    },
    // ✅ เรียก backend ตรวจสอบ email/password จริง
    async authorize(credentials) {
      if (!credentials?.email || !credentials.password) return null;

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        });

        if (!res.ok) {
          console.error("❌ Login failed:", await res.text());
          return null;
        }

        const data = await res.json();
        // backend คืน uid, idToken, etc.
        const uid = data.uid || data.localId || null;
        if (!uid) {
          console.error("⚠️ ไม่มี uid กลับมาจาก backend:", data);
          return null;
        }

        const user: User = {
          id: uid, // ✅ สำคัญ: ให้เป็น uid จริงจาก backend
          name: data.shopName || "Store Owner",
          email: credentials.email,
        };

        return user;
      } catch (err) {
        console.error("🔥 authorize error:", err);
        return null;
      }
    },
  }),
],


  callbacks: {
    // ✅ หลีกเลี่ยง any โดยพิมพ์ชนิดพารามิเตอร์ให้ชัดเจน
    async jwt({
      token,
      user,
      account,
    }: {
      token: JWT;
      user?: User | AdapterUser;
      account?: Account | null;
    }) {
      const t: AppToken = { ...token };

      // ครั้งแรกที่ล็อกอิน จะมี user.id → ใช้เป็น uid
      if (user?.id) t.uid = user.id;

      // ถ้าเป็น OAuth และ provider มี access_token
      if (account?.access_token) t.accessToken = account.access_token;

      return t;
    },

    async session({
      session,
      token,
    }: {
      session: Session;
      token: JWT;
    }) {
      const s: AppSession = {
        ...session,
        user: { ...(session.user ?? {}) },
      } as AppSession;

      const t = token as AppToken;
      if (s.user && t.uid) s.user.uid = t.uid;

      return s;
    },
  },
};
