import { createClient } from "@supabase/supabase-js";
import { encrypt, decrypt } from "../utils/crypto.js";

// Initialize Admin Client for Secure Operations (Bypass RLS)
const getSupabaseAdmin = () => {
    const supabaseUrl = process.env['SUPABASE_URL'];
    const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('[UserService] Missing Supabase URL or Service Key.');
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
};

export const UserService = {
    async storeDerivToken({ userId, derivToken, accountId }: { userId: string, derivToken: string, accountId: string }) {
        const encrypted = encrypt(derivToken);

        const { error } = await getSupabaseAdmin()
            .from('user_deriv_tokens')
            .upsert(
                {
                    user_id: userId,
                    encrypted_token: encrypted,
                    account_id: accountId,
                    created_at: new Date().toISOString()
                },
                { onConflict: 'user_id' }
            );

        if (error) {
            console.error('[UserService] Failed to store token:', error);
            throw new Error(`Database Error: ${error.message}`);
        }

        console.log(`[UserService] Stored secure token for user ${userId} (${accountId})`);
    },

    async getDerivToken(userId: string): Promise<string | null> {
        const { data, error } = await getSupabaseAdmin()
            .from('user_deriv_tokens')
            .select('encrypted_token')
            .eq('user_id', userId)
            .single();

        if (error || !data) {
            // It's common to not find a token if user hasn't linked account
            return null;
        }

        return decrypt(data.encrypted_token);
    },

    async findOrCreateUserFromDeriv(derivAccountId: string, email?: string): Promise<{ id: string; email: string; role: 'ADMIN' | 'USER' }> {
        // 1. Check if user exists with this deriv account id in user_deriv_tokens
        // Actually, we need to reverse lookup: deriv_account_id -> user_id
        const { data: tokenData } = await getSupabaseAdmin()
            .from('user_deriv_tokens')
            .select('user_id')
            .eq('account_id', derivAccountId)
            .single();

        if (tokenData) {
            // User exists, fetch details
            const { data: userData } = await getSupabaseAdmin().auth.admin.getUserById(tokenData.user_id);
            if (userData && userData.user) {
                return {
                    id: userData.user.id,
                    email: userData.user.email ?? '',
                    role: (userData.user.user_metadata?.['role'] as 'ADMIN' | 'USER') ?? 'USER'
                };
            }
        }

        // 2. User does not exist, create a new one
        // We will create a "Deriv User" in Supabase Auth
        // If email is provided (from Deriv), use it. Else fake one.
        const userEmail = email || `${derivAccountId.toLowerCase()}@deriv.user`;
        const tempPassword = `Deriv-${Math.random().toString(36).slice(-10)}`;

        let userId: string;

        // Attempt to create user first. This handles formatted/normalized email checks safely.
        const { data: newUser, error: createError } = await getSupabaseAdmin().auth.admin.createUser({
            email: userEmail,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { role: 'USER', source: 'deriv' }
        });

        if (createError) {
            // If error is "User already registered", fetch that user
            // This simplifies logic significantly
            const { data: users } = await getSupabaseAdmin().auth.admin.listUsers();
            const found = users.users.find(u => u.email === userEmail);
            if (found) {
                userId = found.id;
            } else {
                throw new Error(`Failed to create user: ${createError.message}`);
            }
        } else {
            userId = newUser.user.id;
        }

        // 3. Link them in user_deriv_tokens (will be updated with token later in storeDerivToken, but good to reserve account_id)
        // Actually, storeDerivToken handles the upsert. We can return here and let the caller call storeDerivToken.

        // Return user structure
        // Refetch to be sure or construct
        const { data: finalUser } = await getSupabaseAdmin().auth.admin.getUserById(userId);
        return {
            id: finalUser?.user?.id ?? userId,
            email: finalUser?.user?.email ?? userEmail,
            role: (finalUser?.user?.user_metadata?.['role'] as 'ADMIN' | 'USER') ?? 'USER'
        };
    }
};
