<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/brand/pause-logo-dark.svg">
    <img src="docs/brand/pause-logo.svg" alt="PAUSE" height="48">
  </picture>
</h1>

It's 11pm and you're scrolling. A creator you follow posts a haul. A jacket shows up in your feed, then again in an ad, then again in a shop you opened "just to look." You want it right now. Two days later you barely remember it.

PAUSE uses that gap. Before you buy a piece of clothing, you add it to PAUSE. It shows you the closest thing you already own and what the purchase does to your monthly budget. Then you choose. Pause for 24 hours, pause for 7 days, or decide on the spot.

## Why I built it

We buy more clothes than ever, and we keep them for less time. Social media turned every feed into a storefront. Fast fashion made a new top cost less than lunch. Checkout takes one tap, your card is already saved, and buy now pay later splits the price into small pieces that feel like nothing.

None of that is an accident. Shopping sites are built to make you act before you think. Countdown timers, low stock warnings, "12 people are looking at this." The urge to buy peaks quickly and fades just as quickly, so the faster you check out, the more of it you act on.

Waiting is the cheapest tool you have. PAUSE gives it back to you.

## Try it

Open the live site and click Try the demo. You get your own sample closet with 43 pieces, a $300 monthly plan and a few past decisions. Nothing you do there touches anyone else's demo, and you can start over any time from the menu. It works on your phone too.

## How it works

1. Add the piece you want. Type what caught your eye, then confirm the name and price.
2. Compare. PAUSE puts it next to the closest piece you own and shows which details match, like colour, category and style. It also shows how the price fits your monthly plan.
3. Decide. The default is a 24 hour pause. You can also pause for 7 days, decide later, let it go or buy anyway.

## What you'll find in the app

Home greets you and shows your month in PAUSE, with a tip drawn from your own decisions. It also tracks your monthly plan and your savings goal.

Decisions holds everything you've added, in four tabs called On pause, Undecided, Let go and Bought.

Closet holds what you own. You can browse it as a grid or as a clothing rack, see which categories you own the most of, and build outfits from pieces you already have.

Budget and goals lets you set a monthly plan, a savings goal, or both. Every item you let go adds its price to your goal. PAUSE never moves real money. It only counts what you chose not to spend.

## Product decisions

Pauses end silently. You get no reminder and no notification. A reminder brings the urge right back, so the item quietly moves to Undecided and waits for you there.

PAUSE never shows a similarity percentage, on purpose. The piece you want doesn't have to be identical to one you own. If it's close, that's enough reason to stop and ask yourself if you really need another one. So the app shows which details match and a plain label like Very similar.

The copy never scolds you. Saved only ever means money you kept. Buy anyway is always one tap away. PAUSE adds a moment of friction, not a wall.

The demo comes first. It lets anyone try the full product today, with no account and no inbox access.

## What's next

1. Link your email so PAUSE builds your closet from your real orders. This is the hard part, because your inbox is private. PAUSE should read only order confirmations, keep only the item details it needs and let you delete all of it whenever you want. Google also reviews any app that asks to read Gmail before real users can connect.
2. Match a Buy anyway decision to its order email so one purchase never counts twice.
3. Let you choose how long Undecided items wait before they move to Let go. Today it's 60 days.
4. Offer different tones for the nudge. Some people want a gentle question. Others want a blunt reminder of what they already own. You should get to pick.

## The research behind it

PAUSE grew out of reading on young adult overconsumption, the power of delay and how fast the urge to buy fades. Here's what stood out.

Social media drives a lot of unplanned buying. Only 9% of Gen Z say their social media purchases are planned ahead (GoDaddy, 2024). Almost half of social media users have bought something on impulse after seeing it in their feed, and 68% of them regret at least one of those purchases (Bankrate and YouGov, 2023).

Stress plays a part too. 37% of Gen Z say they "doom spend" to cope with stress (Intuit Credit Karma, 2024). And buy now pay later makes it easy to overdo it. 47% of its users paid late in the past year (LendingTree, 2026).

The pressure is designed in. A study of the top 200 US shopping sites found impulse triggers everywhere, from countdowns and low stock warnings to "people are looking" counters (Moser, Schoenebeck and Resnick, 2019).

Waiting works, if the wait is real. A delay of about 25 hours lowered both the urge to buy and the intent to buy (Moser, University of Michigan, 2020). A 10 minute wait did nothing, because people kept shopping while they waited. In another study, the further ahead people ordered, the less they spent and the fewer indulgent items they chose (Milkman, Rogers and Bazerman, 2010).

Reflection helps even more. People in their 20s rated three questions as the most helpful. What would this replace? How much do you need it? What are the reasons for and against? (Han and others, 2021). PAUSE asks exactly those.

Tone matters. Frequent impulse buyers asked for tools that slow them down, and rejected tools built on guilt or regret (Moser and others, 2019). That's why PAUSE never shames you.

The wanting fades. For shoppers who care a lot about things, happiness peaks before the purchase and drops after it (Richins, 2013).

Plenty of young people already want to buy less. 53% of Gen Z say they're doing or considering a no buy approach (Intuit Credit Karma, 2025). But wanting to buy less doesn't change much on its own. A tool that adds a checkpoint at the moment you buy does.

To keep it honest, most of the youth numbers come from industry surveys, and the delay studies are small. They all point the same way, though.

## Built with

Next.js 16 and React 19, Prisma 7 on Neon Postgres, and Auth.js for sessions. The Anthropic API tags clothes and suggests outfits. Vitest runs the tests, and Vercel hosts the site.

Built by Salma Elsebaie.
