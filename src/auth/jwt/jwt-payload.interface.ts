import { UserRole } from "../../users/schemas/user.schema";
import { AccountType } from "../../users/schemas/user.schema";

export interface JwtPayload {
    sub: string;
    role: UserRole;
    accountType: AccountType
}

export interface AuthenticatedUser {
    userId: string;
    role: UserRole;
    accountType: AccountType
}
