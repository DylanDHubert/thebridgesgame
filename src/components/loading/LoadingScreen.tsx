/** FOUR SW RUN FRAMES. 80MS EACH, SAME PACE AS THE BOARD. */
const RUN_FRAMES = [0, 1, 2, 3] as const;

/** SW RUN, LOOPING IN PLACE. */
export function BoarRun() {
  return (
    <div className="boar-sw-run" aria-hidden="true">
      {RUN_FRAMES.map((frame) => (
        <img
          key={frame}
          src={`/assets/boar/boar_SW_run_${frame}.png`}
          alt=""
          width={46}
          height={32}
          draggable={false}
        />
      ))}
    </div>
  );
}

/** PLAIN LOADING MARK — SW RUN LOOP AND A BAR. */
export function LoadingScreen() {
  return (
    <div className="flex h-full min-h-dvh w-full flex-col items-center justify-center gap-5 bg-white text-black">
      <BoarRun />
      <div className="loading-track" role="progressbar" aria-label="Loading">
        <div className="loading-fill" />
      </div>
    </div>
  );
}
