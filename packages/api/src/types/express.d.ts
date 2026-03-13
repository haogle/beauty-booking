declare namespace Express {
  interface Request {
    user?: {
      userId: string;
      accountId: string;
      salonId: string;
      role: string;
      permissions: string[];
    };
  }
}
