import { forwardRef } from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ label, className = "", id, children, ...rest }, ref) {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");

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
          className={`vulcan-input w-full ${className}`}
          {...rest}
        >
          {children}
        </select>
      </div>
    );
  },
);
