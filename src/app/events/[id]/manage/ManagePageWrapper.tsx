'use client';

/**
 * ManagePageWrapper Component
 * Sets the navbar to match the manage page's dark theme for seamless appearance.
 */

import { useImmersiveNavbar } from '@/contexts/NavbarThemeContext';
import { ReactNode } from 'react';

interface ManagePageWrapperProps {
    children: ReactNode;
}

export function ManagePageWrapper({ children }: ManagePageWrapperProps) {
    // Set navbar to match the manage page background color
    useImmersiveNavbar('#13151A');

    return <>{children}</>;
}
