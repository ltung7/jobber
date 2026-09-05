// Type definitions for /api/admin/users endpoints

export interface FirebaseUser {
	uid: string;
	email: string | null;
	displayName: string | null;
	photoURL: string | null;
	disabled: boolean;
	createdAt?: string;
	lastSignInAt?: string;
}

export interface UsersResponse {
	users: FirebaseUser[];
	total: number;
}

export interface CreateUserRequest {
	email: string;
	password: string;
	displayName?: string;
}

export interface CreateUserResponse {
	uid: string;
	email: string | null;
	displayName: string | null;
}

export interface UpdateUserRequest {
	uid: string;
	displayName?: string;
	disabled?: boolean;
}

export interface UpdateUserResponse {
	uid: string;
	email: string | null;
	displayName: string | null;
	disabled: boolean;
}

export interface DeleteUserRequest {
	uid: string;
}

export interface DeleteUserResponse {
	success: boolean;
	deleted: boolean;
}

export interface ErrorResponse {
	error: string;
}