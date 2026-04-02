export const APP_SUPPORT_EMAIL =
  process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() || 'support@athleticore.app';

export const APP_SUPPORT_MAILTO = `mailto:${APP_SUPPORT_EMAIL}?subject=${encodeURIComponent('AthletiCore Support')}`;

export const PRIVACY_POLICY_SECTIONS = [
  {
    title: 'What the app stores',
    body:
      'AthletiCore stores the account details, training logs, readiness check-ins, nutrition entries, weight data, and planning inputs you add so the app can personalize guidance and keep your history available across sessions.',
  },
  {
    title: 'How the data is used',
    body:
      'Your data is used to power planning, workout, nutrition, hydration, and weight-cut features inside the app. It is not presented as a medical diagnosis or emergency service.',
  },
  {
    title: 'Your controls',
    body:
      'You can review and update profile inputs in the app, sign out at any time, and permanently delete your account from the Account section.',
  },
  {
    title: 'Support contact',
    body: `Questions about privacy or account issues can be sent to ${APP_SUPPORT_EMAIL}.`,
  },
] as const;
