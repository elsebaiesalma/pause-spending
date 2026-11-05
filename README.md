<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/brand/pause-logo-dark.svg">
    <img src="docs/brand/pause-logo.svg" alt="PAUSE" height="48">
  </picture>
</h1>

It's 11pm and you're scrolling. A creator you follow posts a haul. A jacket shows up in your feed, then again in an ad, then again in a shop you opened "just to look." You want it right now. Two days later you barely remember it.

PAUSE is where that jacket goes before you buy it. It shows you the closest thing you already own and what the price does to your monthly budget. Then you pause for 24 hours, pause for 7 days, or decide on the spot.

## The problem

Most clothing bought from a feed was never planned. Only 9% of Gen Z say their social media purchases are planned ahead (GoDaddy, 2024), and 68% of people who bought on impulse from social media regret at least one of those purchases (Bankrate and YouGov, 2023). A lot of it goes back. US shoppers were expected to return 19.3% of what they bought online in 2025 (National Retail Federation, 2025).

Young shoppers know this. 53% of Gen Z say they're doing or considering a no buy approach (Intuit Credit Karma, 2025). But wanting to buy less doesn't change much on its own. People who watched underconsumption videos on TikTok bought at about the same rate as everyone else (Measure Protocol, 2025). The intention is there. What's missing is a checkpoint at the moment of buying, and shopping sites are designed to skip it.

## Who it's for

Young adults, roughly 18 to 30, who buy clothes online, mostly on a phone, often late at night or from a creator's link. They want to buy less, but they don't want a budgeting app, a shopping ban or a lecture. They want a moment to check before they pay. This is also the group most likely to buy through social media, use buy now pay later and say they spend to cope with stress.

## What I built

A web app that works on a phone or a laptop.

1. Add the piece you want. Type what caught your eye, then confirm the name and price.
2. Compare. PAUSE puts it next to the closest piece you own and shows which details match, like colour, category and style. It asks three short questions and shows how the price fits your monthly plan.
3. Decide. The default is a 24 hour pause. You can also pause for 7 days, decide later, let it go or buy anyway.

Home shows your month in PAUSE, with a tip drawn from your own decisions. Decisions holds everything you've added, in four tabs called On pause, Undecided, Let go and Bought. Closet holds what you own, as a grid or a clothing rack, and lets you build outfits from pieces you already have. Budget and goals sets a monthly plan and a savings goal. Every item you let go adds its price to your goal. PAUSE never moves real money. It only counts what you chose not to spend.

## Try it

Open the live site and click Try the demo. You get your own sample closet with 43 pieces, a $300 monthly plan and a few past decisions. Nothing you do there touches anyone else's demo, and you can start over any time from the menu.

## How I used AI

### In the product

PAUSE uses Claude through the Anthropic API in two places.

Tagging. When a piece is added, Claude tags its colour, category and style. Those tags are how PAUSE finds the closest piece you own and shows which details match.

Outfits. If you still want something after the pause, PAUSE suggests outfits built from your own closet. The model only returns the ids of pieces you own, and the app writes each description from your real item names, so it can never suggest something you don't have.

If a model call fails, the pause screen still works. AI helps the decision. It never blocks it.

### To build it

I built PAUSE with Claude as my engineer and design partner. I set the direction, and Claude helped with the code, the tests and the research. I reviewed what it produced, decided what to keep and what to change, and merged every change myself.

## Decisions I made

I decided what PAUSE should and shouldn't do. That covered the problem to focus on, who it's for, how it should feel, and what to leave out. The AI helped me build and test those choices, but the direction was mine.

PAUSE adds friction on purpose. A purchase you think through is one you're less likely to return, and a shopper who feels good about what they bought is more likely to come back. The goal is purchases you keep.

The demo comes first. Reading your order emails would build your closet automatically, but it means asking for access to your inbox. I parked it so anyone can try the full product today with no account and no inbox access.

I used Shopify's Polaris guidelines as the design reference.

## What's next

1. Link your email so PAUSE builds your closet from your real orders. This is the hard part, because your inbox is private. PAUSE should read only order confirmations, keep only the item details it needs and let you delete all of it whenever you want. Google also reviews any app that asks to read Gmail before real users can connect.
2. Match a Buy anyway decision to its order email so one purchase never counts twice.
3. Let you choose how long Undecided items wait before they move to Let go. Today it's 60 days.
4. Offer different tones for the nudge. Some people want a gentle question. Others want a blunt reminder of what they already own. You should get to pick.

## The research behind it

PAUSE grew out of reading on impulse buying, the power of delay and how fast the urge to buy fades. Beyond the numbers above, here's what shaped the design.

Stress plays a part. 37% of Gen Z say they "doom spend" to cope with stress (Intuit Credit Karma, 2024). And buy now pay later makes it easy to overdo it. 47% of its users paid late in the past year (LendingTree, 2026).

The pressure is designed in. A study of the top 200 US shopping sites found impulse triggers everywhere, from countdowns and low stock warnings to "people are looking" counters (Moser, Schoenebeck and Resnick, 2019).

Waiting works, if the wait is real. A delay of about 25 hours lowered both the urge to buy and the intent to buy (Moser, University of Michigan, 2020). A 10 minute wait did nothing, because people kept shopping while they waited. In another study, the further ahead people ordered, the less they spent and the fewer indulgent items they chose (Milkman, Rogers and Bazerman, 2010).

Reflection helps even more. People in their 20s rated three questions as the most helpful. What would this replace? How much do you need it? What are the reasons for and against? (Han and others, 2021). PAUSE asks exactly those.

Tone matters. Frequent impulse buyers asked for tools that slow them down, and rejected tools built on guilt or regret (Moser and others, 2019). That's why PAUSE never shames you.

The wanting fades. For shoppers who care a lot about things, happiness peaks before the purchase and drops after it (Richins, 2013).

## Built with

Next.js 16 and React 19, Prisma 7 on Neon Postgres, and Auth.js for sessions. The Anthropic API tags clothes and suggests outfits. Vitest runs the tests, and Vercel hosts the site.

Built by Salma Elsebaie.
