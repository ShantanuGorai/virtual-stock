import * as React from "react";
import { AuthCard, LoginForm, SignupForm, VerifyCodeForm } from "@/components/ui/auth-forms-signin-signup";
import { Check } from "lucide-react";
import "./App.css";

/* The whole sign-in flow on a split screen. Sign in fails on purpose so you
   can see the error read out as an alert. Sign up rates the password as you
   type and says what is missing. Verify accepts 123456; paste works in any
   box, and the phone offers the code from the SMS. */

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
type Step = "login" | "signup" | "verify";
const BARE = "max-w-none rounded-none bg-transparent p-0 shadow-none ring-0 sm:p-0";

function getInitialStep(): Step {
  const mode = new URLSearchParams(window.location.search).get("mode");
  return mode === "signup" ? "signup" : "login";
}

function App() {
  const [step, setStep] = React.useState<Step>(getInitialStep);
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-6">
      <div className="grid w-full max-w-[820px] min-w-0 overflow-hidden rounded-[20px] [corner-shape:squircle] bg-card shadow-sm ring-1 ring-border sm:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="hidden flex-col bg-primary p-7 text-primary-foreground sm:flex">
          <p className="flex items-center gap-2.5 text-[14px] font-semibold">
            <span className="grid size-7 place-items-center rounded-[8px] [corner-shape:squircle] bg-primary-foreground text-[12px] font-bold text-primary">N</span>
            Northwind
          </p>
          <p className="mt-10 text-[22px] leading-[1.2] font-semibold tracking-[-0.02em]">Contracts signed before the call ends.</p>
          <ul className="mt-6 grid gap-3 text-[13px] text-primary-foreground/80">
            {["Send a PDF for signature in a minute", "Track every signer in one place", "Invoices and receipts built in"].map((t) => (
              <li key={t} className="flex gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0" aria-hidden /> {t}
              </li>
            ))}
          </ul>
          <p className="mt-auto pt-10 text-[12px] text-primary-foreground/60">Trusted by 2,400 studios and agencies</p>
        </aside>

        <div className="p-6 sm:p-8">
          <div role="group" aria-label="Screen" className="mb-7 inline-flex rounded-[10px] [corner-shape:squircle] bg-muted p-0.5">
            {(["login", "signup", "verify"] as Step[]).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={step === s}
                onClick={() => setStep(s)}
                className={`h-8 rounded-[8px] [corner-shape:squircle] px-3 text-[12.5px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring ${step === s ? "bg-background shadow-sm" : "text-foreground/70 hover:text-foreground"}`}
              >
                {s === "login" ? "Sign in" : s === "signup" ? "Sign up" : "Verify"}
              </button>
            ))}
          </div>
          {step === "login" && (
            <AuthCard level={2} className={BARE} title="Welcome back" description="Sign in to your workspace">
              <LoginForm forgotHref="#" signupHref="#" onSubmit={async () => { await wait(700); throw new Error("That email and password don't match. Try again or reset your password."); }} />
            </AuthCard>
          )}
          {step === "signup" && (
            <AuthCard level={2} className={BARE} title="Create your account" description="Free for 14 days, no card">
              <SignupForm termsHref="#" privacyHref="#" loginHref="#" onSubmit={async () => { await wait(700); setStep("verify"); }} />
            </AuthCard>
          )}
          {step === "verify" && (
            <AuthCard level={2} className={BARE} title="Check your email" description="One more step">
              <VerifyCodeForm destination="maya@northwind.studio" onVerify={async (c) => { await wait(600); if (c !== "123456") throw new Error("That code is not right. Check the latest email."); }} onResend={() => wait(400)} />
            </AuthCard>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
