import { UserRole } from "../../users/schemas/user.schema";


export interface JwtPayload {
    sub: string; // userId
    role: UserRole;
}

export interface AuthenticatedUser {
    userId: string;
    role: UserRole;
}
