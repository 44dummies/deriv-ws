/**
 * Single Source of Truth for Admin IDs
 * Used by Frontend: AdminProtected, Callback
 * Sync this with server/src/config/admin.js manually or via build process
 */
export const ADMIN_IDS = [
    'CR9935850'
];

export const isAdminId = (id) => {
    if (!id) return false;
    return ADMIN_IDS.includes(id);
};
