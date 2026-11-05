# PAUSE

You see a jacket online. You want it right now. Two days later you barely remember it.

PAUSE uses that gap. Before you buy a piece of clothing, you add it to PAUSE. It shows you the closest thing you already own and what the purchase does to your monthly budget. Then you choose. Pause for 24 hours, pause for 7 days, or decide on the spot.

I built PAUSE because checkout keeps getting faster. One tap, saved cards, buy now pay later. The urge to buy peaks quickly and fades just as quickly. Waiting is the cheapest tool you have, and most shopping apps work hard to take it away.

## Try it

Open the live site and click Try the demo. You get your own sample closet with 43 pieces, a $300 monthly plan and a few past decisions. Nothing you do there touches anyone else's demo, and you can start over any time from the menu.

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

PAUSE never shows a similarity percentage. Matching runs on simple rules, so the app shows which details match and a plain label like Very similar. A score like 87% would claim a precision the app doesn't have.

The copy never scolds you. Saved only ever means money you kept. Buy anyway is always one tap away. PAUSE adds a moment of friction, not a wall.

The demo comes first. Gmail order import is built but switched off. Google requires a security review before real users can grant read access to their inbox, so the demo lets anyone try the full product today.

## What's next

1. Turn on order import from Gmail once Google approves it.
2. Match a Buy anyway decision to its order email so one purchase never counts twice.
3. Let you choose how long Undecided items wait before they move to Let go. Today it's 60 days.
4. Test the layout on more real phones.

## The research behind it

PAUSE grew out of reading on young adult overconsumption, the power of delay and how fast the urge to buy fades. The app quotes one study in particular. The further ahead people ordered, the less they spent and the fewer indulgent items they chose (Milkman, Rogers and Bazerman, 2010).

## Built with

Next.js 16 and React 19, Prisma 7 on Neon Postgres, and Auth.js for sessions. The Anthropic API tags clothes and suggests outfits. Vitest runs the tests, and Vercel hosts the site.

## Run it yourself

You need Node 24 and a Postgres database.

1. Install packages with `npm install`.
2. Create a `.env` file with the variables below.
3. Apply the schema with `npx prisma migrate deploy`.
4. Start the app with `npm run dev` and open localhost on port 3000.

Run the tests with `npm test`.

### Required variables

`DATABASE_URL` points to your Postgres database.

`AUTH_SECRET` signs your sessions.

`ANTHROPIC_API_KEY` turns on tagging and outfit suggestions. Without it the app still runs, but it skips those steps.

### Optional variables

`GMAIL_ENABLED=true` brings back Google sign in and Gmail import. You also need `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` and `TOKEN_ENCRYPTION_KEY`.

`BRAVE_SEARCH_API_KEY` turns on product search.

`CRON_SECRET` protects the scheduled sync route.

`TEST_DATABASE_URL` points to a separate database for tests.

Built by Salma Elsebaie.
