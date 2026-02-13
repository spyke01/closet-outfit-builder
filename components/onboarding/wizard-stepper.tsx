'use client';

interface WizardStepperProps {
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[];
}

export function WizardStepper({ currentStep, totalSteps, stepLabels }: WizardStepperProps) {
  return (
    <nav aria-label="Onboarding progress" className="w-full mb-8">
      <ol className="flex items-center justify-between">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isUpcoming = stepNumber > currentStep;

          return (
            <li key={stepNumber} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`
                    flex items-center justify-center w-10 h-10 min-w-[44px] min-h-[44px] rounded-full border-2 transition-colors
                    ${isCurrent ? 'border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500' : ''}
                    ${isCompleted ? 'border-green-600 bg-green-600 text-white dark:border-green-500 dark:bg-green-500' : ''}
                    ${isUpcoming ? 'border-gray-300 bg-white text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400' : ''}
                  `}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`Step ${stepNumber}${stepLabels?.[index] ? `: ${stepLabels[index]}` : ''}${isCurrent ? ' (current)' : ''}${isCompleted ? ' (completed)' : ''}`}
                  role="img"
                >
                  <span className="text-sm font-semibold">{stepNumber}</span>
                </div>
                {stepLabels?.[index] && (
                  <span
                    className={`
                      mt-2 text-xs text-center hidden sm:block
                      ${isCurrent ? 'text-blue-600 font-semibold dark:text-blue-400' : ''}
                      ${isCompleted ? 'text-green-600 dark:text-green-400' : ''}
                      ${isUpcoming ? 'text-gray-500 dark:text-gray-400' : ''}
                    `}
                    aria-hidden="true"
                  >
                    {stepLabels[index]}
                  </span>
                )}
              </div>
              {stepNumber < totalSteps && (
                <div
                  className={`
                    flex-1 h-0.5 mx-2 transition-colors
                    ${stepNumber < currentStep ? 'bg-green-600 dark:bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}
                  `}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
