type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  detail?: string;
};

export function PageHeader({ eyebrow, title, detail }: PageHeaderProps) {
  return (
    <header className="border-b border-[rgb(95_84_74)] bg-[rgb(12_48_92)] px-4 py-2.5 sm:px-6">
      <div className="mx-auto max-w-5xl">
        {eyebrow ? (
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[rgb(72_176_210)]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-base font-semibold text-[rgb(210_196_138)]">{title}</h1>
        {detail ? (
          <p className="mt-0.5 text-xs text-[rgb(36_148_132)]">{detail}</p>
        ) : null}
      </div>
    </header>
  );
}
