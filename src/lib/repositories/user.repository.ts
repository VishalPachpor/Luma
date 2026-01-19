/**
 * User Repository
 * Data access layer for users
 * Persists user profiles to Firestore for public access
 */

import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp,
    collection,
    query,
    where,
    getDocs
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import type { User } from '@/types';

const USERS_COLLECTION = 'users';

// Mock user for development fallback
const mockUser: User = {
    id: '1',
    name: 'Jane Doe',
    email: 'jane@apple.com',
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent('Jane Doe')}&background=random`,
    role: 'user',
    bio: 'Digital artist and event organizer based in SF.',
    subscriberCount: 42,
    joinedAt: new Date().toISOString()
};

/**
 * Get user by ID (Public Profile)
 */
export async function findById(id: string): Promise<User | null> {
    if (!id) return null;

    if (!db || !isFirebaseConfigured) {
        return id === '1' ? mockUser : null;
    }

    try {
        const docRef = doc(db, USERS_COLLECTION, id);
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
            const data = snapshot.data();
            return {
                ...data,
                id: snapshot.id,
                joinedAt: data.joinedAt?.toDate?.()?.toISOString() || data.joinedAt
            } as User;
        }
        return null;
    } catch (error) {
        console.error('[UserRepo] Error fetching user:', error);
        return null;
    }
}

/**
 * Sync Firebase Auth user to Firestore (Create/Update on login)
 */
export async function syncUser(firebaseUser: any): Promise<User> {
    if (!db || !isFirebaseConfigured) {
        return mockUser;
    }

    const { uid, email, displayName, photoURL } = firebaseUser;
    const userRef = doc(db, USERS_COLLECTION, uid);

    try {
        const snapshot = await getDoc(userRef);

        if (!snapshot.exists()) {
            // Create new user profile
            const newUser: User = {
                id: uid,
                name: displayName || 'Anonymous',
                email: email || '',
                avatar: photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || email || 'User')}&background=random`,
                role: 'user',
                joinedAt: new Date().toISOString(),
                subscriberCount: 0
            };

            await setDoc(userRef, {
                ...newUser,
                joinedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            return newUser;
        } else {
            // Update existing user (sync basic auth details if changed, but preserve profile)
            // We typically only update name/avatar if they are missing or if we want to auto-sync
            // For now, let's just return the existing profile
            const data = snapshot.data();
            return {
                ...data,
                id: snapshot.id,
                joinedAt: data.joinedAt?.toDate?.()?.toISOString() || data.joinedAt
            } as User;
        }
    } catch (error) {
        console.error('[UserRepo] Error syncing user:', error);
        throw error;
    }
}

/**
 * Update user profile
 */
export async function updateProfile(id: string, updates: Partial<User>): Promise<void> {
    if (!db || !isFirebaseConfigured) return;

    try {
        const userRef = doc(db, USERS_COLLECTION, id);
        await updateDoc(userRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('[UserRepo] Error updating profile:', error);
        throw error;
    }
}

/**
 * Get current user (Derived from Auth state ideally, but here for compatibility)
 */
export async function getCurrentUser(): Promise<User> {
    return mockUser;
}
