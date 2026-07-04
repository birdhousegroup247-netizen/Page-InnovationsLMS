import { Check } from 'lucide-react';
import { cn } from '../../../utils/cn';

/**
 * WizardStepper — the numbered 1→4 progress rail used by both Onboarding
 * Center wizards (student + staff).
 *
 * States per step: done (check, brand red), current (filled red ring),
 * upcoming (muted). The connector line between steps fills as steps
 * complete. Purely presentational — the wizard owns the step index.
 */
export default function WizardStepper({ steps, currentStep }) {
  return (
    <div className="flex items-center justify-center w-full max-w-3xl mx-auto px-2">
      {steps.map((label, i) => {
        const done = i < currentStep;
        const current = i === currentStep;
        return (
          <div key={label} className={cn('flex items-center', i > 0 && 'flex-1')}>
            {i > 0 && (
              <div
                className={cn(
                  'h-0.5 flex-1 mx-2 sm:mx-3 rounded transition-colors',
                  done || current ? 'bg-brand-red' : 'bg-gray-200 dark:bg-gray-700'
                )}
              />
            )}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors',
                  done && 'bg-brand-red text-white',
                  current && 'bg-brand-red text-white ring-4 ring-brand-red-100 dark:ring-brand-red-900',
                  !done && !current && 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                )}
              >
                {done ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  'hidden sm:block text-sm font-medium whitespace-nowrap',
                  current
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400'
                )}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
