// Shared form-styling tokens for the auth flows (Login, Signup,
// Instructor Apply). Centralised so every auth page renders inputs,
// labels, and buttons with the same look — no per-page drift.

export const inputClass =
  'w-full pl-11 pr-4 py-3 text-sm bg-gray-50 dark:bg-dark-700/60 ' +
  'border border-gray-200 dark:border-border-dark rounded-xl ' +
  'text-gray-900 dark:text-text-dark-primary ' +
  'placeholder-gray-400 dark:placeholder-text-dark-muted ' +
  'hover:border-brand-blue/40 focus:outline-none focus:ring-2 ' +
  'focus:ring-brand-blue/30 focus:border-brand-blue transition-all';

// Variant for inputs WITHOUT a left icon — drops the pl-11 reserved space.
export const inputClassNoIcon = inputClass.replace('pl-11', 'pl-4');

// Variant for inputs with a right-side action (eg. password show/hide) —
// keeps left icon space, reserves right space.
export const inputClassWithRightAction = inputClass.replace('pr-4', 'pr-11');

export const selectClass =
  inputClass.replace('pr-4', 'pr-9') + ' appearance-none cursor-pointer';

export const textareaClass = inputClassNoIcon + ' min-h-[110px] resize-y leading-relaxed';

export const labelClass =
  'block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1.5 ' +
  'uppercase tracking-wider';

// Primary CTA — red brand gradient (Page Innovations' signature colour),
// high contrast on both white and near-black backgrounds.
export const primaryButtonClass =
  'group relative w-full py-3.5 px-4 bg-gradient-to-r from-brand-red ' +
  'to-brand-red-700 hover:from-brand-red-600 hover:to-brand-red-800 text-white ' +
  'font-semibold text-sm rounded-xl shadow-lg shadow-brand-red/30 ' +
  'hover:shadow-xl hover:shadow-brand-red/40 transition-all focus:outline-none ' +
  'focus:ring-2 focus:ring-brand-red/60 focus:ring-offset-2 ' +
  'dark:focus:ring-offset-dark-800 disabled:opacity-50 ' +
  'disabled:cursor-not-allowed flex items-center justify-center gap-2';

// Secondary red-family variant — kept for the instructor flow. Uses the
// maroon brand-purple so it's distinct from the brighter primary red.
export const primaryButtonClassPurple = primaryButtonClass
  .replace(/from-brand-red\b/g, 'from-brand-purple')
  .replace(/to-brand-red-700/g, 'to-brand-purple-700')
  .replace(/hover:from-brand-red-600/g, 'hover:from-brand-purple-600')
  .replace(/hover:to-brand-red-800/g, 'hover:to-brand-purple-800')
  .replace(/shadow-brand-red\/30/g, 'shadow-brand-purple/30')
  .replace(/shadow-brand-red\/40/g, 'shadow-brand-purple/40')
  .replace(/ring-brand-red\/60/g, 'ring-brand-purple/60');

// Secondary (outline / Google) — neutral, hover-border accent.
export const secondaryButtonClass =
  'w-full py-3 px-4 bg-white dark:bg-dark-700/50 border border-gray-200 ' +
  'dark:border-border-dark hover:border-gray-400 dark:hover:border-gray-600 ' +
  'hover:bg-gray-50 dark:hover:bg-dark-700 text-gray-700 ' +
  'dark:text-text-dark-primary font-medium text-sm rounded-xl transition-all ' +
  'focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:ring-offset-2 ' +
  'dark:focus:ring-offset-dark-800 flex items-center justify-center gap-3';

// Form card chrome — every auth form sits in one of these.
export const formCardClass =
  'relative bg-white dark:bg-dark-800 rounded-2xl sm:rounded-3xl ' +
  'shadow-xl shadow-gray-200/40 dark:shadow-black/30 border border-gray-100 ' +
  'dark:border-gray-800 p-5 sm:p-8 animate-scale-in transition-colors';
