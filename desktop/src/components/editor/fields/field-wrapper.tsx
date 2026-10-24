interface FieldWrapperProps {
  children: React.ReactNode;
  columns?: number;
}

export function FieldWrapper({
  children,
  columns = 2,
}: FieldWrapperProps) {
  return (
    <div
      className="grid gap-2.5"
      style={{
        gridTemplateColumns:
          columns > 1
            ? `repeat(auto-fit, minmax(min(100%, 190px), 1fr))`
            : "minmax(0, 1fr)",
      }}
    >
      {children}
    </div>
  );
}
