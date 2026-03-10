import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, className = "", id, ...rest }, ref) {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

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
          className={`vulcan-input w-full ${error ? "border-[var(--color-destructive)]" : ""} ${className}`}
          {...rest}
        />
        {error && <p className="mt-1 text-xs text-[var(--color-destructive-text)]">{error}</p>}
      </div>
    );
  },
);
