import { Check } from 'lucide-react';

interface StepperProps {
  current: 1 | 2 | 3;
}

const STEPS = [
  { number: 1, label: 'Verifikasi' },
  { number: 2, label: 'Refleksi' },
  { number: 3, label: 'Sertifikat' },
];

export function Stepper({ current }: StepperProps) {
  return (
    <ol className="stepper" aria-label="Tahapan pengisian">
      {STEPS.map((step) => {
        const isDone = current > step.number;
        const isActive = current === step.number;
        return (
          <li
            key={step.number}
            className={`stepper-item${isActive ? ' is-active' : ''}${isDone ? ' is-done' : ''}`}
            aria-current={isActive ? 'step' : undefined}
          >
            <span className="stepper-marker" aria-hidden="true">
              {isDone ? <Check size={14} strokeWidth={2.4} /> : step.number}
            </span>
            <span className="stepper-label">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
