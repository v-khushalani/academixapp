import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="grid min-w-0 gap-2 border-b border-border bg-card px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-4 lg:px-5">
      <div className="min-w-0">
        <h1 className="break-words text-lg font-semibold text-foreground sm:text-xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end [&>button]:shrink-0">{actions}</div> : null}
    </div>
  );
}

export function PageBody({ children }: { children: ReactNode }) {
  return <div className="min-w-0 p-3 sm:p-4 lg:p-5">{children}</div>;
}
