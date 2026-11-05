import { clashDisplay } from "./fonts";
import { ScrollReveal } from "./ScrollReveal";
import { HeroPreview } from "@/components/HeroPreview";
import { DemoButton } from "@/components/DemoButton";
import { ReceiptHero } from "./ReceiptHero";
import { UrgeCurve } from "./UrgeCurve";
import { isGmailEnabled } from "@/lib/demo";
import styles from "./page.module.css";

// Every figure on this page is from the research brief in the project
// ("Pause Before You Purchase"), quoted with its source. No invented numbers,
// no testimonials, no wear claims (there is no wear data).
const STATS = [
  {
    value: "60%",
    claim: "60% of Gen Z social media users have impulse-bought something they saw on social",
    source: "Bankrate/YouGov, 2023",
  },
  {
    value: "9%",
    claim: "Only 9% of Gen Z say their social media purchases are planned",
    source: "GoDaddy, 2024",
  },
  {
    value: "62%",
    claim: "62% of Gen Z users of Buy Now, Pay Later (BNPL) regret a BNPL purchase",
    source: "LendingTree",
  },
  {
    value: "~25h",
    claim: "A ~25-hour wait lowered both the urge to buy and purchase intent",
    source: "Moser, U. Michigan, 2020",
  },
] as const;

// The first finding (the 25-hour wait) is told by the urge chart above these cards.
const FINDINGS = [
  {
    title: "A few minutes of reflection helps too",
    body: "Asking what an item would replace, how much it is needed, and one reason for and against was the prompt shoppers in their 20s found most helpful.",
    source: "Han et al., WWW 2021",
    feature: "Every pause starts with those questions.",
  },
  {
    title: "Guilt doesn't work, and people don't want it",
    body: "Frequent impulse buyers asked for tools that help them deliberate, and rejected tools built on guilt, regret or being watched.",
    source: "Moser et al., CHI 2019",
    feature: "Pauses end quietly, with no reminders or streaks.",
  },
] as const;

export default function Home() {
  // While Gmail is parked, every "get started" CTA opens the demo instead.
  const gmail = isGmailEnabled();

  const steps = [
    {
      title: "Add what caught your eye",
      body: "Type what you're thinking of buying. Confirm the name and price, and add a photo if you like, before anything else happens.",
    },
    {
      title: "See it next to your closet",
      body: gmail
        ? "Your closet is built from real order confirmations. If you already own something similar, PAUSE shows it with the reason, plus what this does to your monthly plan."
        : "If you already own something similar, PAUSE shows it with the reason, plus what this does to your monthly plan.",
    },
    {
      title: "Pause, then decide",
      body: "Wait 24 hours or 7 days. When the pause ends, the item moves quietly to Undecided. Still want it? Build an outfit from what you own first.",
    },
  ];

  const faqs = [
    {
      q: "Does PAUSE stop me from buying things?",
      a: "No. Nothing is blocked. PAUSE adds a moment between wanting something and buying it, and shows you what you already own. The decision stays yours.",
    },
    {
      q: "What happens when a pause ends?",
      a: "The item moves to Undecided without a notification. A reminder would bring the urge right back, so PAUSE stays quiet. You can come back to it whenever you like.",
    },
    {
      q: "Where does my closet come from?",
      a: gmail
        ? "From the clothing, shoe and accessory order confirmations in your Gmail, read-only. You can also add pieces yourself."
        : "In the demo, from a sample closet, so you can try the whole flow right away. Each visitor gets their own copy.",
    },
    {
      q: "Why clothing?",
      a: "Clothes are where \"I already own something like this\" happens most. Seeing the near-duplicate next to the new thing is the most useful pause.",
    },
    {
      q: "Can I use my real orders to build my closet?",
      a: "Not yet. We're building a version that links your email and fills your closet automatically, with your privacy first. Until then, try everything with the demo.",
    },
  ];

  const cta = gmail ? (
    <a href="/connect/gmail" className={styles.btnPrimary}>
      Connect Gmail
    </a>
  ) : (
    <DemoButton label="Try the demo" className={styles.btnPrimary} />
  );

  // The hero is on the espresso band, so its buttons are the light ones.
  const heroActions = (
    <>
      {gmail ? (
        <a href="/connect/gmail" className={styles.btnLight}>
          Connect Gmail
        </a>
      ) : (
        <DemoButton label="Try the demo" className={styles.btnLight} />
      )}
      <a href="#how-it-works" className={styles.btnGhostLight}>
        See how it works
      </a>
    </>
  );

  return (
    <div className={`${styles.root} ${clashDisplay.variable}`}>
      <ScrollReveal />

      {/* Hero: a receipt that prints, gets stamped, and drops the repeats. */}
      <ReceiptHero
        actions={heroActions}
        note={gmail ? undefined : "No account needed. Opens with a sample closet."}
      />

      {/* What PAUSE does, with the product itself. */}
      <section className={styles.hero} aria-labelledby="product-heading">
        <div>
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            What PAUSE does
          </span>
          <h2 id="product-heading" className={styles.sectionHeading}>
            Before you buy it, see what you already own.
          </h2>
          <p className={styles.heroSub}>
            PAUSE lines up what you want with the pieces you already have, then gives you a moment to
            decide. Reflection, not restriction.
          </p>
          <div className={styles.heroActions}>{cta}</div>
        </div>
        <HeroPreview />
      </section>

      {/* How it works */}
      <section className={styles.section} id="how-it-works" aria-labelledby="how-heading">
        <span className={styles.eyebrow}>How it works</span>
        <h2 id="how-heading" className={styles.sectionHeading}>
          Three simple steps
        </h2>
        <ol className={styles.steps}>
          {steps.map((step, i) => (
            <li key={step.title} className={`${styles.step} reveal`} data-reveal>
              <span className={styles.stepNumber} aria-hidden="true">
                {i + 1}
              </span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepBody}>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Why a pause works: each finding, and what PAUSE does because of it. */}
      <section className={styles.sectionTinted} id="why" aria-labelledby="why-heading">
        <div className={styles.sectionInner}>
          <div className={styles.whyIntro}>
            <span className={styles.eyebrow}>Why a pause works</span>
            <h2 id="why-heading" className={styles.sectionHeading}>
              The urge is loud. Then it fades.
            </h2>
            <p className={styles.sectionLede}>
              In shopping experiments, a wait of about 25 hours lowered both the urge to buy and the
              intent to buy. A 10-minute wait did not: people kept shopping while they waited.
            </p>
          </div>
          <UrgeCurve />
          <p className={styles.chartPayoff}>
            The default is <strong>Pause for 24 hours</strong>.{" "}
            <span className={styles.statSourceLight}>Moser, University of Michigan, 2020</span>
          </p>
          <div className={styles.findings}>
            {FINDINGS.map((finding) => (
              <article key={finding.title} className={`${styles.finding} reveal`} data-reveal>
                <h3 className={styles.findingTitle}>{finding.title}</h3>
                <p className={styles.findingBody}>{finding.body}</p>
                <p className={styles.findingFeature}>{finding.feature}</p>
                <span className={styles.statSourceLight}>{finding.source}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Gmail sync, only when Gmail is on; parked while the demo is the way in. */}
      {gmail && (
        <section className={styles.section} id="sync" aria-labelledby="sync-heading">
          <span className={styles.eyebrow}>Your closet, automatically</span>
          <h2 id="sync-heading" className={styles.sectionHeading}>
            Built from your real inbox
          </h2>
          <p className={styles.sectionLede}>
            Connect Gmail once, and PAUSE reads clothing, shoe and accessory order confirmations,
            read-only, to build your closet. Nothing is sent or deleted.
          </p>
        </section>
      )}

      {/* The problem, in numbers, on the dark band. */}
      <section className={styles.band} aria-labelledby="stats-heading">
        <div className={styles.bandInner}>
          <h2 id="stats-heading" className={styles.bandHeading}>
            Checkout is built to be fast. Deciding shouldn&apos;t be.
          </h2>
          <div className={styles.statGrid}>
            {STATS.map((stat) => (
              <div key={stat.source} className={`${styles.stat} reveal`} data-reveal>
                <div className={styles.statValue}>{stat.value}</div>
                <p className={styles.statNote}>{stat.claim}</p>
                <span className={styles.statSource}>{stat.source}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ: native details/summary, so it works without JavaScript and with a keyboard. */}
      <section className={styles.section} id="faq" aria-labelledby="faq-heading">
        <div className={styles.faqGrid}>
          <div>
            <h2 id="faq-heading" className={styles.sectionHeading}>
              Frequently Asked Questions
            </h2>
          </div>
          <div className={styles.faqList}>
            {faqs.map((item) => (
              <details key={item.q} className={styles.faq}>
                <summary className={styles.faqQuestion}>{item.q}</summary>
                <p className={styles.faqAnswer}>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing call to action, on the dark band. */}
      <footer className={styles.footer} id="footer">
        <div className={styles.footerInner}>
          <h2 className={styles.footerHeadline}>Try your first pause</h2>
          <p className={styles.footerSub}>
            {gmail
              ? "Connect Gmail and PAUSE builds your closet from your real order history."
              : "No sign-up. Opens with a sample closet, so you can try it in a minute."}
          </p>
          {gmail ? (
            <a href="/connect/gmail" className={styles.btnLight}>
              Connect Gmail
            </a>
          ) : (
            <DemoButton label="Try the demo" className={styles.btnLight} />
          )}
          <div className={styles.footerMeta}>
            <span>&copy; 2026 PAUSE</span>
            <nav className={styles.footerLinks} aria-label="Footer">
              <a href="#how-it-works">How it works</a>
              <a href="#why">Why a pause works</a>
              <a href="#faq">FAQ</a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
