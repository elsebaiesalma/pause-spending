import Link from "next/link";
import { DemoButton } from "@/components/DemoButton";
import { nextStep, type SetupStep } from "@/lib/dashboard/setupGuide";
import styles from "./SetupGuide.module.css";

// Polaris-style setup guide: progress, the steps, and one action for the
// next step only. Hidden once everything is done (Home decides that).
export function SetupGuide({ steps, isDemo }: { steps: SetupStep[]; isDemo: boolean }) {
  const doneCount = steps.filter((s) => s.done).length;
  const next = nextStep(steps);

  function action(step: SetupStep) {
    if (step.id === "addedItem") {
      return isDemo ? (
        <DemoButton action="/api/demo/sample-item" label="Try a sample item" pendingLabel="Opening…" className="btn btn-primary" />
      ) : (
        <Link href="/desired-items/new" className="btn btn-primary">
          Add an item
        </Link>
      );
    }
    if (step.id === "madeDecision") {
      return (
        <Link href="/considering" className="btn btn-primary">
          Open Decisions
        </Link>
      );
    }
    return (
      <Link href="/lookbook/board?returnTo=/dashboard" className="btn btn-primary">
        Build a look
      </Link>
    );
  }

  return (
    <section className={styles.guide} aria-labelledby="setup-guide-heading">
      <div className={styles.header}>
        <h2 id="setup-guide-heading" className={styles.title}>
          Get to know PAUSE
        </h2>
        <span className={styles.count}>
          {doneCount} of {steps.length} done
        </span>
      </div>
      <div
        className={styles.progress}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={doneCount}
        aria-label="Setup progress"
      >
        <span style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <ol className={styles.steps} id="setup-guide-steps">
        {steps.map((step) => {
          const isNext = next?.id === step.id;
          return (
            <li key={step.id} className={`${styles.step} ${isNext ? styles.stepOpen : ""}`}>
              <span className={`${styles.check} ${step.done ? styles.checkDone : ""}`} aria-hidden="true">
                {step.done ? "✓" : ""}
              </span>
              <div className={styles.stepBody}>
                <p className={`${styles.stepTitle} ${step.done ? styles.stepTitleDone : ""}`}>
                  {step.title}
                  {step.done && <span className="sr-only"> (done)</span>}
                </p>
                {isNext && (
                  <>
                    <p className={styles.stepText}>{step.description}</p>
                    <div className={styles.stepAction}>{action(step)}</div>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
