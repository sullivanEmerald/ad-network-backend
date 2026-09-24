
import { AccountType } from "../../users/schemas/user.schema";

export interface JwtPayload {
    sub: string;
    accountType: AccountType
}

export interface AuthenticatedUser {
    userId: string;
    accountType: AccountType
}
