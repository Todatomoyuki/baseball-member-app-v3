export type AuthMember = {
    id: string;
    name: string;
    number: string;
    isAdmin: boolean;
    canEditLineup: boolean;
};

export type LoginMember = Pick<AuthMember, "id" | "name" | "number">;

export type AuthResponse = {
    authenticated: boolean;
    member: AuthMember | null;
    members?: LoginMember[];
    needsMemberSelection?: boolean;
};
