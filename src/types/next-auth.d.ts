import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      uid: string;
      idToken?: string;
    };
  }
  interface User {
    uid?: string;
    idToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    idToken?: string;
  }
}
