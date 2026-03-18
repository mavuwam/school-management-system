// Authentication Service Interface
import { UserRole, Permission } from '../models';

export interface Credentials {
  username: string;
  password: string;
  schoolId: string;
}

export interface AuthResult {
  success: boolean;
  sessionToken?: string;
  requiresMFA?: boolean;
  error?: string;
}

export interface UserContext {
  userId: string;
  role: UserRole;
  schoolId: string;
  permissions: Permission[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface AuthenticationService {
  login(credentials: Credentials): Promise<AuthResult>;
  verifyMFA(userId: string, token: string): Promise<boolean>;
  logout(sessionId: string): Promise<void>;
  validateSession(sessionId: string): Promise<UserContext>;
  validatePassword(password: string): ValidationResult;
}
