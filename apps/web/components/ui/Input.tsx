import { forwardRef, useId } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, className = "", id, ...rest }, ref) {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;

    return (
      <div>
        {label && (
          <label htmlFor={inputId} className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`vulcan-input w-full ${error ? "border-[var(--color-destructive)]" : ""} ${className}`}
          {...rest}
        />
        {error && <p id={errorId} role="alert" className="mt-1 text-xs text-[var(--color-destructive-text)]">{error}</p>}
      </div>
    );
  },
);
