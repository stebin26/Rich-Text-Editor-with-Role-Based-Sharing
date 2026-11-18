export default function DashboardLoading() {
  return (
    <div className="min-h-screen lg:flex">
      <div className="hidden border-r border-line-soft bg-surface/50 lg:block lg:h-screen lg:w-[17rem] lg:shrink-0 lg:p-5">
        <div className="flex items-center gap-2.5">
          <div className="ui-skeleton h-8 w-8 rounded-[10px]" />
          <div className="ui-skeleton h-4 w-24" />
        </div>
        <div className="mt-8 space-y-2">
          {[0, 1, 2].map((item) => (
            <div key={item} className="ui-skeleton h-9 w-full rounded-xl" />
          ))}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="border-b border-line bg-surface/85 px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="ui-skeleton h-8 w-8 rounded-[10px]" />
              <div className="ui-skeleton h-4 w-24" />
            </div>
            <div className="flex items-center gap-2">
              <div className="ui-skeleton h-8 w-8 rounded-full" />
              <div className="ui-skeleton h-8 w-20 rounded-[10px]" />
            </div>
          </div>
        </div>

        <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-6 sm:px-8 sm:pt-9">
          <div className="rounded-[1.5rem] border border-line bg-surface px-5 py-6 shadow-card sm:px-8 sm:py-9">
            <div className="ui-skeleton h-3 w-28" />
            <div className="mt-4 ui-skeleton h-9 w-64 max-w-full" />
            <div className="mt-3 ui-skeleton h-3.5 w-80 max-w-full" />
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <div className="ui-skeleton h-12 w-full rounded-[0.875rem] sm:w-44" />
              <div className="ui-skeleton h-14 w-full rounded-[1.25rem] sm:w-72" />
            </div>
          </div>

          {[0, 1].map((section) => (
            <div key={section} className="mt-9">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="ui-skeleton h-4 w-28" />
                <div className="ui-skeleton h-4 w-8 rounded-full" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2].map((card) => (
                  <div
                    key={card}
                    className="overflow-hidden rounded-[1.25rem] border border-line bg-surface shadow-card"
                  >
                    <div className="ui-skeleton h-[8.25rem] rounded-none" />
                    <div className="space-y-2 p-4">
                      <div className="ui-skeleton h-4 w-3/5" />
                      <div className="ui-skeleton h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}
