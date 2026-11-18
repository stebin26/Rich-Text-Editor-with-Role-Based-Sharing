export default function DocumentLoading() {
  return (
    <div className="min-h-screen">
      <div className="border-b border-line/80 bg-canvas/85">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="ui-skeleton h-8 w-8 rounded-[10px]" />
            <div className="ui-skeleton h-4 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <div className="ui-skeleton h-8 w-8 rounded-full" />
            <div className="ui-skeleton hidden h-3.5 w-20 sm:block" />
            <div className="ui-skeleton h-8 w-20 rounded-[10px]" />
          </div>
        </div>
      </div>

      <div className="bg-canvas/90 px-3 pb-2.5 pt-3 sm:px-6">
        <div className="mx-auto w-full max-w-5xl rounded-[1.25rem] bg-[#1f1b3a] px-3 py-3">
          <div className="flex items-center gap-2.5">
            <div className="ui-skeleton h-8 w-24 rounded-[10px] bg-white/10" />
            <div className="ui-skeleton h-5 w-16 rounded-full bg-white/10" />
            <div className="ui-skeleton h-5 w-24 rounded-full bg-white/10" />
            <div className="ml-auto flex items-center gap-2">
              <div className="ui-skeleton h-8 w-20 rounded-[10px] bg-white/10" />
              <div className="ui-skeleton h-8 w-20 rounded-[10px] bg-white/10" />
            </div>
          </div>
          <div className="mt-2.5 flex gap-1.5 rounded-[0.9rem] bg-white/95 p-1.5">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="ui-skeleton h-8 w-9 rounded-[0.65rem]" />
            ))}
          </div>
        </div>
      </div>

      <main className="editor-canvas w-full pb-20 pt-6 sm:pt-9">
        <div className="print-canvas mx-auto w-full max-w-3xl px-3 sm:px-6">
          <div className="paper print-surface">
            <div className="px-6 pb-6 pt-10 sm:px-14 sm:pb-7 sm:pt-14">
              <div className="ui-skeleton h-10 w-3/4 sm:h-12" />
              <div className="mt-4 h-1 w-12 rounded-full bg-[linear-gradient(90deg,#4f46e5,#7c3aed)]" />
              <div className="mt-4 flex items-center gap-2">
                <div className="ui-skeleton h-5 w-24 rounded-full" />
                <div className="ui-skeleton h-3 w-14" />
                <div className="ui-skeleton h-3 w-20" />
              </div>
            </div>
            <div className="space-y-3 px-6 pb-14 pt-2 sm:px-14 sm:pb-20">
              {[100, 92, 96, 78, 88, 64].map((width, index) => (
                <div
                  key={index}
                  className="ui-skeleton h-4"
                  style={{ width: `${width}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
