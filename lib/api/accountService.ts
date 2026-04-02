import { supabase } from '../supabase';

export async function deleteMyAccount() {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) {
    throw error;
  }

  await supabase.auth.signOut({ scope: 'local' });
}
