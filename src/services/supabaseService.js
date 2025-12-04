import { createClient } from '@supabase/supabase-js';


const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || '';


export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;


export const isSupabaseConfigured = () => {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && supabase);
};





/**
 * Create or update user profile after Deriv OAuth login
 */
export const upsertUserProfile = async (derivUser) => {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  
  
  if (!derivUser?.loginid) {
    console.error('Cannot create profile: deriv_login_id is null or undefined');
    return { data: null, error: new Error('Missing required field: loginid') };
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      deriv_login_id: derivUser.loginid,
      email: derivUser.email,
      fullname: derivUser.fullname,
      currency: derivUser.currency,
      is_virtual: derivUser.is_virtual,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'deriv_login_id'
    })
    .select()
    .single();
    
  return { data, error };
};

/**
 * Get user profile by Deriv login ID
 */
export const getUserProfile = async (loginId) => {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('deriv_login_id', loginId)
    .single();
    
  return { data, error };
};





/**
 * Get all journal entries for a user
 */
export const getJournalEntries = async (loginId) => {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('deriv_login_id', loginId)
    .order('created_at', { ascending: false });
    
  return { data, error };
};

/**
 * Create a new journal entry
 */
export const createJournalEntry = async (loginId, entry) => {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  
  const { data, error } = await supabase
    .from('journal_entries')
    .insert({
      deriv_login_id: loginId,
      title: entry.title,
      content: entry.content,
      mood: entry.mood,
      tags: entry.tags || [],
    })
    .select()
    .single();
    
  return { data, error };
};

/**
 * Delete a journal entry
 */
export const deleteJournalEntry = async (entryId, loginId) => {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  
  const { data, error } = await supabase
    .from('journal_entries')
    .delete()
    .eq('id', entryId)
    .eq('deriv_login_id', loginId);
    
  return { data, error };
};





/**
 * Sync trade history to Supabase
 */
export const syncTradeHistory = async (loginId, trades) => {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  
  
  const tradesWithUser = trades.map(trade => ({
    deriv_login_id: loginId,
    contract_id: trade.contract_id,
    symbol: trade.symbol,
    buy_price: trade.buy_price,
    sell_price: trade.sell_price,
    profit: trade.profit,
    purchase_time: new Date(trade.purchase_time * 1000).toISOString(),
    sell_time: new Date(trade.sell_time * 1000).toISOString(),
    shortcode: trade.shortcode,
  }));
  
  
  const { data, error } = await supabase
    .from('trades')
    .upsert(tradesWithUser, {
      onConflict: 'deriv_login_id,contract_id'
    });
    
  return { data, error };
};

/**
 * Get trade history from Supabase
 */
export const getTradeHistory = async (loginId, limit = 100) => {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('deriv_login_id', loginId)
    .order('sell_time', { ascending: false })
    .limit(limit);
    
  return { data, error };
};





/**
 * Get user settings
 */
export const getUserSettings = async (loginId) => {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('deriv_login_id', loginId)
    .single();
    
  return { data, error };
};

/**
 * Update user settings
 */
export const updateUserSettings = async (loginId, settings) => {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  
  const { data, error } = await supabase
    .from('user_settings')
    .upsert({
      deriv_login_id: loginId,
      theme: settings.theme,
      notifications_enabled: settings.notifications_enabled,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'deriv_login_id'
    })
    .select()
    .single();
    
  return { data, error };
};

const supabaseService = {
  supabase,
  isSupabaseConfigured,
  upsertUserProfile,
  getUserProfile,
  getJournalEntries,
  createJournalEntry,
  deleteJournalEntry,
  syncTradeHistory,
  getTradeHistory,
  getUserSettings,
  updateUserSettings,
};

export default supabaseService;
