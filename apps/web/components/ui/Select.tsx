import { forwardRef, useId } from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ label, error, className = "", id, children, ...rest }, ref) {
    const generatedId = useId();
    const selectId = id || generatedId;
    const errorId = `${selectId}-error`;

    return (
      <div>
        {label && (
          <label htmlFor={selectId} className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`vulcan-input w-full ${error ? "border-[var(--color-destructive)]" : ""} ${className}`}
          {...rest}
        >
          {children}
        </select>
        {error && <p id={errorId} role="alert" className="mt-1 text-xs text-[var(--color-destructive-text)]">{error}</p>}
      </div>
    );
  },
);
