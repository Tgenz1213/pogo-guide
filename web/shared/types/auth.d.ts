declare module "#auth-utils" {
  interface User {
    id: string;
    username: string;
    provider: string;
    isAdmin: boolean;
  }
}

export {};
