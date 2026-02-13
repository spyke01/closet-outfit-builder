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
                    ${isCurrent ? 'border-primary bg-primary text-primary-foreground' : ''}
                    ${isCompleted ? 'border-secondary bg-secondary text-secondary-foreground' : ''}
                    ${isUpcoming ? 'border-border bg-card text-muted-foreground' : ''}
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
                      ${isCurrent ? 'text-primary font-semibold' : ''}
                      ${isCompleted ? 'text-secondary' : ''}
                      ${isUpcoming ? 'text-muted-foreground' : ''}
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
                    ${stepNumber < currentStep ? 'bg-secondary' : 'bg-border'}
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
