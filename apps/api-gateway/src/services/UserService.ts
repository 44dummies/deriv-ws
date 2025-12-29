import { createClient } from "@supabase/supabase-js";
import { encrypt, decrypt } from "../utils/crypto.js";

// Initialize Admin Client for Secure Operations (Bypass RLS)
const supabaseUrl = process.env['SUPABASE_URL'] ?? '';
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('[UserService] Missing Supabase URL or Service Key. Database operations will fail.');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

export const UserService = {
    async storeDerivToken({ userId, derivToken, accountId }: { userId: string, derivToken: string, accountId: string }) {
        const encrypted = encrypt(derivToken);

        const { error } = await supabaseAdmin
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
        const { data, error } = await supabaseAdmin
            .from('user_deriv_tokens')
            .select('encrypted_token')
            .eq('user_id', userId)
            .single();

        if (error || !data) {
            // It's common to not find a token if user hasn't linked account
            return null;
        }

        return decrypt(data.encrypted_token);
    }
};
