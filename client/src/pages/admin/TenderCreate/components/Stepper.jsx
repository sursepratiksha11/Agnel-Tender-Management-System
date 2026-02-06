import { Check } from "lucide-react";

export default function Stepper({ steps, currentStep }) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.id;
        const isActive = currentStep === step.id;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="flex items-center flex-1">
            {/* Step Circle */}
            <div className="flex items-center">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                  ${
                    isCompleted
                      ? "bg-green-500 text-white"
                      : isActive
                      ? "bg-blue-600 text-white ring-4 ring-blue-100"
                      : "bg-neutral-200 text-neutral-500"
                  }
                `}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" strokeWidth={2.5} />
                ) : (
                  step.id
                )}
              </div>

              {/* Step Label */}
              <div className="ml-3">
                <p
                  className={`text-sm font-medium ${
                    isActive
                      ? "text-neutral-900"
                      : isCompleted
                      ? "text-green-600"
                      : "text-neutral-500"
                  }`}
                >
                  {step.label}
                </p>
              </div>
            </div>

            {/* Connector Line */}
            {!isLast && (
              <div className="flex-1 mx-4">
                <div
                  className={`h-0.5 transition-all ${
                    isCompleted ? "bg-green-500" : "bg-neutral-200"
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
