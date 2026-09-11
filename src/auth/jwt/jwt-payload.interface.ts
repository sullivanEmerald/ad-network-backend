import { UserRole } from "../../users/schemas/user.schema";


export interface JwtPayload {
    sub: string; // userId
    accountId: string;
    role: UserRole;
}

export interface AuthenticatedUser {
    userId: string;
    accountId: string;
    role: UserRole;
}
