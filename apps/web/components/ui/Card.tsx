interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return <div className={`vulcan-card ${className}`}>{children}</div>;
}

export function CardHeader({ children, className = "" }: CardProps) {
  return (
    <div className={`flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3 ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = "" }: CardProps) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = "" }: CardProps) {
  return (
    <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-[var(--color-border)] px-4 py-3 ${className}`}>
      {children}
    </div>
  );
}
