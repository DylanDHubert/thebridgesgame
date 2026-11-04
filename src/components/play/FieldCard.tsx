const ROW = "grid grid-cols-[1.5rem_1fr_auto] items-center gap-2 px-2 py-1";

export type FieldRow = {
  username: string;
  cost: number;
};

/** ONE NAME, ITS LOWEST COST, THEN THE TWELVE CHEAPEST. */
export function fieldRows(
  rows: FieldRow[],
  you: FieldRow | null,
): FieldRow[] {
  const best = new Map<string, FieldRow>();
  const keep = (row: FieldRow) => {
    const username = row.username.trim() || "Boar";
    const key = username.toLowerCase();
    const current = best.get(key);
    if (!current || row.cost < current.cost) {
      best.set(key, { username, cost: row.cost });
    }
  };
  for (const row of rows) {
    keep(row);
  }
  if (you) {
    keep(you);
  }
  return [...best.values()]
    .sort((a, b) => a.cost - b.cost || a.username.localeCompare(b.username))
    .slice(0, 12);
}

/** TOP OF THE FIELD FOR THIS ISLAND. THE CURRENT NAME IS FILLED. */
export function FieldCard({ rows, youName }: { rows: FieldRow[]; youName: string }) {
  const yours = youName.trim().toLowerCase();
  return (
    <article className="flex w-full flex-col border border-black bg-white">
      <header className="border-b border-black px-3 py-2 text-center text-[11px] uppercase tracking-[0.14em]">
        Field
      </header>
      {rows.length === 0 ? (
        <p className="px-3 py-4 text-center text-[10px] uppercase tracking-[0.12em]">No rounds yet</p>
      ) : (
        <ol className="py-1 text-[10px] uppercase tracking-[0.12em]">
          {rows.map((row, index) => {
            const mine = row.username.trim().toLowerCase() === yours;
            return (
              <li
                key={row.username.toLowerCase()}
                className={mine ? `${ROW} bg-black text-white` : ROW}
              >
                <span>{index + 1}</span>
                <span className="min-w-0 truncate">{row.username}</span>
                <span>{row.cost}</span>
              </li>
            );
          })}
        </ol>
      )}
    </article>
  );
}
