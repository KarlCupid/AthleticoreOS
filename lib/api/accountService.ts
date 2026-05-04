import { supabase } from '../supabase';
import { addMonitoringBreadcrumb } from '../observability/breadcrumbs';
import { logError } from '../utils/logger';

export async function signOutCurrentUser() {
  addMonitoringBreadcrumb('auth', 'sign_out_started');
  const { error } = await supabase.auth.signOut();
  if (error) {
    logError('accountService.signOutCurrentUser', error, { accountOperation: 'sign_out' });
    throw error;
  }

  addMonitoringBreadcrumb('auth', 'sign_out_succeeded');
}

export async function deleteMyAccount() {
  addMonitoringBreadcrumb('account', 'account_deletion_started');
  const { error } = await supabase.rpc('delete_my_account');
  if (error) {
    logError('accountService.deleteMyAccount.rpc', error, { accountOperation: 'delete_my_account' });
    throw error;
  }

  const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
  if (signOutError) {
    logError('accountService.deleteMyAccount.signOut', signOutError, { accountOperation: 'local_sign_out' });
    addMonitoringBreadcrumb('account', 'account_deletion_local_sign_out_failed');
  }

  addMonitoringBreadcrumb('account', 'account_deletion_succeeded');
}
