/**
 * User Types
 * Centralized TypeScript type definitions for users
 */

export type UserRole = 'user' | 'admin';

export interface User {
    id: string;
    name: string;
    email: string;
    avatar: string;
    coverImage?: string; // Add cover image for host profile
    role: UserRole;
    phoneNumber?: string;

    // Profile fields
    bio?: string;
    location?: string;
    website?: string;
    twitterHandle?: string;
    socialLinks?: {
        website?: string;
        twitter?: string;
        instagram?: string;
        linkedin?: string;
        youtube?: string;
    };
    subscriberCount?: number;
    joinedAt?: string;
}

export type CreateUserInput = Omit<User, 'id'> & { id?: string };

/**
 * Default mock user for development
 */
export const MOCK_USER: User = {
    id: '1',
    name: 'Jane Doe',
    email: 'jane@apple.com',
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent('Jane Doe')}&background=random`,
    role: 'user',
};
