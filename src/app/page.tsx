import { clashDisplay } from "./fonts";
import { ScrollReveal } from "./ScrollReveal";
import { ImageSlot } from "@/components/ImageSlot";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={`${styles.root} theme-dark ${clashDisplay.variable}`}>
      <ScrollReveal />
      <div className={styles.backdrop} aria-hidden="true" />
      <div className={styles.glow} aria-hidden="true">
        <div className={styles.glowBlob} />
        <div className={styles.glowBlob} />
      </div>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroTopBar}>
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            FOR THE MOMENT BEFORE CHECKOUT
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--color-ink-faint)" }}>
            Reflection, not restriction
          </span>
        </div>

        <div className={styles.heroGrid}>
          <div className={styles.heroImage}>
            <ImageSlot name="hero" alt="Hero image" />
            <span className={styles.heroImageTag}>Fig. 001 / Redundancy Vector</span>
          </div>
          <div className={styles.heroNarrative}>
            <div>
              <span className={styles.eyebrow}>
                <span className={styles.eyebrowDot} />
                The premise
              </span>
              <p>
                We build a little distance between wanting and buying - not by blocking the cart, but by
                showing you what you already own before you get there.
              </p>
            </div>
            <div style={{ borderTop: "1px solid var(--color-line)", paddingTop: "1rem", display: "flex", justifyContent: "space-between", color: "var(--color-ink-faint)" }}>
              <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>Avg. reflection window</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "0.8rem", color: "var(--color-accent-dim)", fontWeight: 700 }}>24H - 7 DAYS</span>
            </div>
            <a href="#philosophy" className={styles.inlineLink} style={{ marginTop: 0 }}>
              Discover the protocol &rarr;
            </a>
          </div>
        </div>

        <h1 className={styles.heroHeadline}>
          PA<em>U</em>SE
        </h1>
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
                PAUSE restores it, gently. When an order confirmation lands in your inbox, or you paste
                a link to something you&apos;re considering, we show your existing wardrobe alongside
                it - the coats, the boots, the bags you already reach for.
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

      {/* PAUSE SCREEN PREVIEW - a slot for a real screenshot of our Pause screen */}
      <div className={styles.banner}>
        <div className={`${styles.bannerCard} reveal`} data-reveal>
          <span className={styles.footerEyebrow} style={{ marginBottom: 0 }}>
            Pause screen preview
          </span>
          <h3>A wool overcoat vs. 4 existing silhouettes</h3>
          <p>
            &quot;You already own four long, heavy outerwear pieces - including the espresso trench
            you&apos;ve worn three times this month. Same category, same weight, similar use.&quot;
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--color-ink-faint)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Budget impact
            </span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "1.35rem", color: "var(--color-accent-dim)" }}>+$1,150.00</span>
          </div>
        </div>
        <div className={styles.bannerShot}>
          <ImageSlot name="pause-screen" alt="Screenshot of the PAUSE pause screen" fit="contain" />
        </div>
      </div>

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
                  Your wardrobe is built automatically from real order-confirmation emails, tagged by
                  category, color and style. If something you already own overlaps, we say so - plainly,
                  with the specific reason - alongside what this purchase does to your monthly budget.
                </p>
              </div>
            </div>
            <div className={`${styles.phase} reveal`} data-reveal>
              <span className={styles.phaseLabel}>Phase 03 // Decide</span>
              <div>
                <h3>Wait it out, or move forward clearly</h3>
                <p>
                  Choose a 24-hour or 7-day wait with no notifications - just an in-app queue you check
                  when you&apos;re ready. Still want it after that? We&apos;ll suggest lower-priced
                  alternatives, secondhand options, and outfit ideas built from your real wardrobe.
                </p>
              </div>
            </div>
            <a href="#archive" className={styles.inlineLink}>
              View the wardrobe archive &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section className={styles.section} id="archive">
        <div className={styles.galleryHeader}>
          <div>
            <span className={styles.eyebrow}>
              <span className={styles.eyebrowDot} />
              Curated dossier
            </span>
            <h2 className={styles.moduleHeading}>
              Sartorial redundancy <em>mappings</em>
            </h2>
          </div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-ink-faint)", maxWidth: "18rem" }}>
            A sample of what a wardrobe match actually looks like.
          </p>
        </div>
        <div className={styles.galleryGrid}>
          <div className={`${styles.galleryItem} reveal`} data-reveal>
            <ImageSlot name="sample-1" alt="Sample image: belted coat" />
            <span className={styles.galleryTag}>Archive // 01</span>
            <div className={styles.galleryCaption}>
              <div className={styles.galleryCaptionTop}>
                <strong>Belted Wool Coat</strong>
                <span>$12.05 / wear</span>
              </div>
              <p>68 documented wears. Same silhouette and weight as the coat you&apos;re considering.</p>
            </div>
          </div>
          <div className={`${styles.galleryItem} reveal`} data-reveal>
            <ImageSlot name="sample-2" alt="Sample image: high-collar styling" />
            <span className={styles.galleryTag}>Styling // 02</span>
            <div className={styles.galleryCaption}>
              <div className={styles.galleryCaptionTop}>
                <strong>The High-Collar Form</strong>
                <span>$0 net outflow</span>
              </div>
              <p>Pair your espresso trench, buttoned to the lapel, with the cream knit you already own.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SYNC */}
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
            <a href="/connect/gmail" className={styles.inlineLink}>
              Connect Gmail to get started &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer} id="footer">
        <div className={styles.footerInner}>
          <span className={styles.footerEyebrow}>Start when you&apos;re ready</span>
          <h2 className={styles.footerHeadline}>
            Begin your first <em>pause</em>
          </h2>
          <p className={styles.footerSub}>
            No waitlist, no account to create - connect Gmail and PAUSE starts building your wardrobe
            from your real order history.
          </p>
          <div style={{ paddingBottom: "1rem" }}>
            <a href="/connect/gmail" className={styles.footerCta}>
              Connect Gmail &rarr;
            </a>
          </div>
          <div className={styles.footerLinks}>
            <a href="#philosophy">Philosophy</a>
            <span>/</span>
            <a href="#mechanism">Mechanism</a>
            <span>/</span>
            <a href="#archive">Archive</a>
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
