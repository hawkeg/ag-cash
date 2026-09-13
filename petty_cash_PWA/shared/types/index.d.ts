export declare enum RequestType {
    EXPENSE = "EXPENSE",
    ADVANCE = "ADVANCE"
}
export declare enum RequestStatus {
    DRAFT = "DRAFT",
    SUBMITTED = "SUBMITTED",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    PAID = "PAID",
    CANCELLED = "CANCELLED"
}
export declare enum AdvanceStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    DISBURSED = "DISBURSED",
    SETTLED = "SETTLED",
    CANCELLED = "CANCELLED"
}
export interface UserMapping {
    id: string;
    agCashUserId: string;
    odooEmployeeId?: number;
    odooEmployeeName?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Request {
    id: string;
    userId: string;
    odooRequestId?: number;
    type: RequestType;
    amount: number;
    description: string;
    status: RequestStatus;
    submittedAt?: Date;
    approvedAt?: Date;
    rejectedAt?: Date;
    approvedBy?: string;
    rejectedBy?: string;
    rejectionReason?: string;
    createdAt: Date;
    updatedAt: Date;
    expenses?: Expense[];
}
export interface Expense {
    id: string;
    requestId: string;
    categoryId?: number;
    vendorId?: number;
    amount: number;
    description: string;
    receiptUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Advance {
    id: string;
    userId: string;
    odooAdvanceId?: number;
    amount: number;
    purpose: string;
    expectedReturnDate?: Date;
    disbursementDate?: Date;
    settlementDate?: Date;
    status: AdvanceStatus;
    createdAt: Date;
    updatedAt: Date;
}
export interface Vendor {
    id: string;
    odooVendorId: number;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Category {
    id: string;
    odooCategoryId: number;
    name: string;
    nameAr?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateRequestDto {
    type: RequestType;
    amount: number;
    description: string;
    expenses: Omit<Expense, 'id' | 'requestId' | 'createdAt' | 'updatedAt'>[];
}
export interface UpdateRequestDto {
    amount?: number;
    description?: string;
    expenses?: Omit<Expense, 'id' | 'requestId' | 'createdAt' | 'updatedAt'>[];
}
export interface CreateAdvanceDto {
    amount: number;
    purpose: string;
    expectedReturnDate?: Date;
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        message: string;
        code?: string;
    };
    timestamp: Date;
}
export interface PaginationParams {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export interface AuthUser {
    id: string;
    email: string;
    emailConfirmed?: boolean;
    userMetadata?: Record<string, any>;
    createdAt?: string;
    updatedAt?: string;
}
export interface SignInCredentials {
    email: string;
    password: string;
}
export interface SignUpCredentials {
    email: string;
    password: string;
    metadata?: Record<string, any>;
}
export interface AuthSession {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
export interface AuthResponse {
    success: boolean;
    user?: AuthUser;
    session?: AuthSession;
    error?: {
        message: string;
        code?: string;
    };
}
//# sourceMappingURL=index.d.ts.map