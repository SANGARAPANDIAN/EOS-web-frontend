"use client";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";

export interface StepperStep {
  id: string;
  label: string;
}

interface StepperProps {
  steps: StepperStep[];
  currentIndex: number;
  getSubtext?: (stepId: string, index: number) => string | undefined;
  onStepClick: (index: number) => void;
}

/** Numbered step rail for multi-step wizards — done/current/upcoming states, connecting line, optional subtext per step. */
export function Stepper({ steps, currentIndex, getSubtext, onStepClick }: StepperProps) {
  return (
    <ol className="flex flex-col">
      {steps.map((step, index) => {
        const done = index < currentIndex;
        const current = index === currentIndex;
        const subtext = getSubtext?.(step.id, index);
        return (
          <li key={step.id} className="relative flex gap-3 pb-6 last:pb-0">
            {index < steps.length - 1 && (
              <span
                className={cn("absolute top-7 left-[13px] h-full w-px", done ? "bg-admin-primary" : "bg-admin-border")}
                aria-hidden="true"
              />
            )}
            <button
              type="button"
              onClick={() => onStepClick(index)}
              className={cn(
                "relative z-10 grid size-7 shrink-0 cursor-pointer place-items-center rounded-admin-pill border text-[13px] font-bold",
                done
                  ? "border-admin-primary bg-admin-primary text-white"
                  : current
                    ? "border-admin-primary bg-admin-canvas text-admin-primary"
                    : "border-admin-border bg-admin-canvas text-admin-muted",
              )}
            >
              {done ? <Icon name="check" size={15} /> : index + 1}
            </button>
            <div className="min-w-0 pt-0.5">
              <div className={cn("text-sm font-semibold", current ? "text-admin-ink" : "text-admin-body")}>{step.label}</div>
              {subtext && <div className="mt-0.5 text-xs text-admin-subtle">{subtext}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
