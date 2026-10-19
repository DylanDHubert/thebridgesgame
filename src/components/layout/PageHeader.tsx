type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  detail?: string;
};

export function PageHeader({ eyebrow, title, detail }: PageHeaderProps) {
  return (
    <header className="border-b border-black bg-white px-4 py-2.5 sm:px-6">
      <div className="mx-auto max-w-5xl">
        {eyebrow ? (
          <p className="text-[10px] uppercase tracking-[0.2em] text-black/55">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-[11px] uppercase tracking-[0.18em]">{title}</h1>
        {detail ? (
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-black/55">{detail}</p>
        ) : null}
      </div>
    </header>
  );
}
