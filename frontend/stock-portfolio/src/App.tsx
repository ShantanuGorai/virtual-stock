import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { LeadsTable } from "@/components/ui/leads-data-table";

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border/40 sticky top-0 z-40 bg-background/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">L</span>
              </div>
              <div>
                <h1 className="text-base font-semibold leading-tight">Lead Pipeline</h1>
                <p className="text-xs text-muted-foreground">Track and engage your leads</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-10">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight">Leads</h2>
            <p className="text-sm text-muted-foreground mt-1">
              A snapshot of your current pipeline. Select leads to take bulk actions.
            </p>
          </div>
          <LeadsTable />
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;
