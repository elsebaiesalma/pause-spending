import { clashDisplay } from "./fonts";
import { ScrollReveal } from "./ScrollReveal";
import { HeroPreview } from "@/components/HeroPreview";
import { DemoButton } from "@/components/DemoButton";
import { isGmailEnabled } from "@/lib/demo";
import styles from "./page.module.css";

export default function Home() {
  // While Gmail is parked, every "get started" CTA opens the demo instead.
  const gmail = isGmailEnabled();
  return (
    <div className={`${styles.root} ${clashDisplay.variable}`}>
      <ScrollReveal />
      {/* HERO */}
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            For the moment before checkout
          </span>
          <h1 className={styles.heroHeadline}>Before you buy it, see what you already own.</h1>
          <p className={styles.heroSub}>
            PAUSE puts the thing you&apos;re about to buy next to the pieces already in your closet,
            then gives you a moment to decide. Reflection, not restriction.
          </p>
          <div className={styles.heroActions}>
            {gmail ? (
              <a href="/connect/gmail" className={styles.btnPrimary}>
                Connect Gmail
              </a>
            ) : (
              <DemoButton label="Try the demo" className={styles.btnPrimary} />
            )}
            <a href="#mechanism" className={styles.btnGhost}>
              See how it works
            </a>
          </div>
          {!gmail && <p className={styles.heroNote}>No account needed. Opens with a sample closet of 30 pieces.</p>}
        </div>
        <HeroPreview />
      </section>

      {/* STATS */}
      <div className={styles.statGrid}>
        <div className={`${styles.stat} reveal`} data-reveal>
          <span className={styles.statLabel}>Impulse buying</span>
          <div className={styles.statValue}>
            60<em style={{ fontStyle: "normal", color: "var(--color-accent-dim)" }}>%</em>
          </div>
          <p className={styles.statNote}>
            60% of Gen Z social media users have impulse-bought something they saw on social
          </p>
          <span className={styles.statSource}>Bankrate/YouGov, 2023</span>
        </div>
        <div className={`${styles.stat} reveal`} data-reveal>
          <span className={styles.statLabel}>Planned purchases</span>
          <div className={styles.statValue}>
            9<em style={{ fontStyle: "normal", color: "var(--color-accent-dim)" }}>%</em>
          </div>
          <p className={styles.statNote}>Only 9% of Gen Z say their social media purchases are planned</p>
          <span className={styles.statSource}>GoDaddy, 2024</span>
        </div>
        <div className={`${styles.stat} reveal`} data-reveal>
          <span className={styles.statLabel}>Buy now, pay later</span>
          <div className={styles.statValue}>
            62<em style={{ fontStyle: "normal", color: "var(--color-accent-dim)" }}>%</em>
          </div>
          <p className={styles.statNote}>62% of Gen Z BNPL users regret a BNPL purchase</p>
          <span className={styles.statSource}>LendingTree</span>
        </div>
        <div className={`${styles.stat} reveal`} data-reveal>
          <span className={styles.statLabel}>The wait</span>
          <div className={styles.statValue} style={{ color: "var(--color-accent-dim)" }}>
            ~25h
          </div>
          <p className={styles.statNote}>A ~25-hour wait lowered both the urge to buy and purchase intent</p>
          <span className={styles.statSource}>Moser, U. Michigan, 2020</span>
        </div>
      </div>

      {/* PHILOSOPHY */}
      <section className={styles.section} id="philosophy">
        <div className={styles.contentGrid}>
          <div>
            <span className={styles.moduleLabel}>Module 01</span>
            <h2 className={styles.moduleHeading}>
              01 / <em>Philosophy</em>
            </h2>
            <hr className={styles.moduleRule} />
            <p className={styles.moduleSub}>The sanctity of hesitation</p>
          </div>
          <div className="reveal" data-reveal>
            <p className={styles.lede}>
              Impulsive spending isn&apos;t a moral failing - it&apos;s an engineered gap between seeing
              something and living with it. One-click checkouts remove that gap entirely.
            </p>
            <div className={styles.twoCol}>
              <p>
                PAUSE restores it, gently. {gmail
                  ? "When an order confirmation lands in your inbox, or you paste a link to something you're considering, we show your existing wardrobe alongside it - the coats, the boots, the bags you already reach for."
                  : "When you paste a link to something you're considering, or just type what caught your eye, we show your existing wardrobe alongside it - the coats, the boots, the bags you already reach for."}
              </p>
              <p>
                Converting a price tag into &quot;what this does to this month&apos;s budget&quot; brings
                weight back to the decision. This isn&apos;t about buying less for its own sake - it&apos;s
                about noticing, before you buy, what you&apos;d actually be adding.
              </p>
            </div>
            <a href="#mechanism" className={styles.inlineLink}>
              Inspect the pause chamber architecture &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* MECHANISM */}
      <section className={styles.section} id="mechanism">
        <div className={styles.contentGrid}>
          <div>
            <span className={styles.moduleLabel}>Module 02</span>
            <h2 className={styles.moduleHeading}>
              02 / <em>Mechanism</em>
            </h2>
            <hr className={styles.moduleRule} />
            <p className={styles.moduleSub}>Three phases of the pause</p>
          </div>
          <div>
            <div className={`${styles.phase} reveal`} data-reveal>
              <span className={styles.phaseLabel}>Phase 01 // Confirm</span>
              <div>
                <h3>Tell us what you&apos;re considering</h3>
                <p>
                  Paste a product link, upload a screenshot, or just type it. We identify the item, its
                  price, and its photo - and show it back to you to confirm before anything else happens.
                </p>
              </div>
            </div>
            <div className={`${styles.phase} reveal`} data-reveal>
              <span className={styles.phaseLabel}>Phase 02 // Reflect</span>
              <div>
                <h3>See it next to what you own</h3>
                <p>
                  {gmail
                    ? "Your wardrobe is built automatically from real order-confirmation emails, tagged by category, color and style. "
                    : "Your wardrobe is the closet you've added, tagged by category, color and style. "}
                  If something you already own overlaps, we say so - plainly, with the specific reason -
                  alongside what this purchase does to your monthly budget.
                </p>
              </div>
            </div>
            <div className={`${styles.phase} reveal`} data-reveal>
              <span className={styles.phaseLabel}>Phase 03 // Decide</span>
              <div>
                <h3>Wait it out, or move forward clearly</h3>
                <p>
                  Choose a 24-hour or 7-day wait. When it ends, the item quietly moves to Undecided, with
                  no notifications. Still want it? Lay out a look from what you already own and see how
                  it fits, in a lookbook built from your real wardrobe.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SYNC - Gmail only; parked while the demo is the way in */}
      {gmail && (
        <section className={styles.section} id="sync">
          <div className={styles.contentGrid}>
            <div>
              <span className={styles.moduleLabel}>Module 03</span>
              <h2 className={styles.moduleHeading}>
                03 / <em>Sync</em>
              </h2>
              <hr className={styles.moduleRule} />
              <p className={styles.moduleSub}>Built from your real inbox</p>
            </div>
            <div>
              <p className={styles.lede}>
                No manual spreadsheet logging. Connect Gmail once, and PAUSE reads clothing, shoe, and
                accessory order confirmations - read-only, nothing sent or deleted - to build your wardrobe
                automatically.
              </p>
              <div className={styles.featureGrid}>
                <div className={`${styles.featurePoint} reveal`} data-reveal>
                  <span className={styles.eyebrow} style={{ marginBottom: 0 }}>
                    <span className={styles.eyebrowDot} />
                  </span>
                  <h4>Read-only, always</h4>
                  <p>We never send, delete, or modify anything in your inbox - and never share your data.</p>
                </div>
                <div className={`${styles.featurePoint} reveal`} data-reveal>
                  <span className={styles.eyebrow} style={{ marginBottom: 0 }}>
                    <span className={styles.eyebrowDot} />
                  </span>
                  <h4>You decide what stays</h4>
                  <p>Disconnect any time and keep your data, or permanently delete everything in one step.</p>
                </div>
                <div className={`${styles.featurePoint} reveal`} data-reveal>
                  <span className={styles.eyebrow} style={{ marginBottom: 0 }}>
                    <span className={styles.eyebrowDot} />
                  </span>
                  <h4>Budget, on your terms</h4>
                  <p>Set your own monthly number. We show spend and remaining - never adjust it for you.</p>
                </div>
              </div>
              {gmail ? (
                <a href="/connect/gmail" className={styles.inlineLink}>
                  Connect Gmail to get started &rarr;
                </a>
              ) : (
                <DemoButton label="Try it with a sample closet →" className={`${styles.buttonReset} ${styles.inlineLink}`} />
              )}
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className={styles.footer} id="footer">
        <div className={styles.footerInner}>
          <span className={styles.footerEyebrow}>Start when you&apos;re ready</span>
          <h2 className={styles.footerHeadline}>
            Begin your first <em>pause</em>
          </h2>
          <p className={styles.footerSub}>
            {gmail
              ? "No waitlist, no account to create - connect Gmail and PAUSE starts building your wardrobe from your real order history."
              : "No waitlist, no account to create. Try it now with a sample closet of 30 pieces."}
          </p>
          <div style={{ paddingBottom: "1rem" }}>
            {gmail ? (
              <a href="/connect/gmail" className={styles.footerCta}>
                Connect Gmail &rarr;
              </a>
            ) : (
              <DemoButton label="Try the demo →" className={`${styles.buttonReset} ${styles.footerCta}`} />
            )}
          </div>
          <div className={styles.footerLinks}>
            <a href="#philosophy">Philosophy</a>
            <span>/</span>
            <a href="#mechanism">Mechanism</a>
          </div>
          <div className={styles.footerMeta}>
            <span>&copy; 2026 PAUSE.</span>
            <span>Built for one wardrobe at a time.</span>
          </div>
        </div>
        <div className={styles.ghostMark} aria-hidden="true">
          PAUSE
        </div>
      </footer>
    </div>
  );
}
