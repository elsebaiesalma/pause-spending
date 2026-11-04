import { GOAL_NAME_MAX } from "@/lib/goals/savingsGoal";
import { GoalSheet } from "./GoalSheet";
import styles from "./MoneyChoice.module.css";

function Choice({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <>
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        <span className={styles.description}>{text}</span>
      </span>
      <span className={styles.radio} aria-hidden="true" />
    </>
  );
}

// Shown on Home until the person sets a plan or a goal: one question, two real
// controls. Picking one opens it right away (the plan in Settings, the goal in
// its sheet); the other stays one click away in Settings, never forced.
export function MoneyChoice({ goalAvailable }: { goalAvailable: boolean }) {
  return (
    <section className={styles.card} aria-labelledby="money-choice-heading">
      <h2 id="money-choice-heading" className={styles.heading}>
        What would help most?
      </h2>
      <p className={styles.sub}>Pick one to start. You can turn on the other any time in Settings.</p>
      <div className={styles.choices}>
        <a href="/budget?open=plan" className={styles.choice}>
          <Choice
            icon="$"
            title="Stay under a monthly amount"
            text="Set a plan, for example $250, and see what is left each month."
          />
        </a>
        {goalAvailable && (
          <GoalSheet
            mode="save"
            triggerLabel="Save toward something"
            triggerClassName={styles.choice}
            triggerContent={
              <Choice
                icon="&#9733;"
                title="Save toward something"
                text="Name something you would rather have. Every item you let go fills it up."
              />
            }
            hasGoal={false}
            nameMax={GOAL_NAME_MAX}
          />
        )}
      </div>
    </section>
  );
}
