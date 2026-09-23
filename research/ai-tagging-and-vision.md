# AI Tagging and Vision: Practical Approaches

All four use cases below share one technique: **vision-capable LLM + forced structured output** (tool-use with a JSON schema, `tool_choice` forced to that tool), which guarantees a valid, parseable object back rather than free-text the app has to re-parse. [Vision — Claude Platform Docs](https://platform.claude.com/docs/en/build-with-claude/vision), search results on Claude Vision API structured extraction.

## (a) Structured tags from item name + image

Input: item name/description (from receipt parsing) + product image URL. Prompt the vision model with both, forcing a schema like `{category, primary_color, secondary_color, style_tags: string[], use_case_tags: string[]}`. This is the same shape used by fashion-specific vision-language models (e.g. the "Fashion Florence" fine-tuned Florence-2 model, which outputs category/color/material/style/occasion as JSON) — a general-purpose vision-capable LLM with a well-specified schema and a few example categories in the prompt gets comparable structured output without needing a fashion-specific fine-tune. [Fashion Florence paper](https://arxiv.org/pdf/2605.09827)

## (b) Screenshot → item name/price/image

Same mechanism: feed the screenshot to the vision model, force a schema `{item_name, price, currency, image_description}`. Screenshots of shopping sites are visually noisy (surrounding UI, multiple products, price shown with strikethrough/sale formatting) — the prompt should explicitly instruct the model to identify the *single main product* being viewed and to prefer the current/sale price over a struck-through original price when both appear.

## (c) "Why this may be redundant" explanation

This step only runs over an already-filtered shortlist (from the structured-tag matching in step (b), not full-catalog AI comparison — consistent with the hybrid approach chosen in idea-honing Q3). Input: the new item's tags/image + the shortlist of similar wardrobe items (tags/image/purchase date). Prompt for a short (1–2 sentence), calm, nonjudgmental explanation referencing the *specific* overlapping attributes (e.g. "You have a similar navy button-down from [merchant], bought 3 months ago — same color and formality level"). Keeping this to a shortlist keeps cost/latency bounded regardless of total wardrobe size.

## (d) Outfit-idea generation from wardrobe items

Input: a set of wardrobe item images/tags + the target item's image/tags. This is a harder generative task than (a)–(c) — realistically it's a **text/reasoning task over the structured tags**, not image generation: prompt the model to propose 2–3 outfit combinations by *naming* specific owned items (by their stored name/image) that would pair well stylistically with the desired item, with brief styling rationale. Actually rendering a combined visual (e.g. a flat-lay mockup) is a materially harder, separate problem (image generation/compositing) — treat that as an out-of-scope stretch goal, not part of MVP; MVP outfit ideas are a list of "pair this with your [item], [item], and [item]" text suggestions with each referenced item's existing photo shown alongside.

## Model choice and cost/latency shape

- All four steps are single-image-or-few-image, single-call vision tasks — well within the capabilities of current vision-capable LLMs (e.g. Claude's or GPT-4-class vision models); no need for a specialized/fine-tuned model at MVP scale.
- Rough shape, not exact pricing: vision calls are more expensive and higher-latency (multi-second) than text-only calls, so batch where possible — e.g. run tag extraction (a) once at ingestion time and cache the result on the item record, rather than re-deriving tags on every comparison. Steps (c) and (d) are naturally low-frequency (only triggered when the user actually considers a purchase), so their cost is bounded regardless of wardrobe size.
- Forcing structured output (JSON schema via tool use) avoids brittle text-parsing and is the standard pattern for all four extraction steps.

## Key takeaways for design
- One consistent technique — vision LLM + forced JSON-schema output — covers tag extraction, screenshot parsing, and redundancy explanations; no need for different tooling per feature.
- Tag extraction (a) should run once at ingestion (receipt or manual add) and be cached, not recomputed per comparison — this keeps the "hybrid" similarity approach from idea-honing Q3 cheap at query time.
- MVP outfit ideas (d) are text suggestions referencing existing wardrobe photos, not generated composite images — visual outfit rendering is an explicit future upgrade, not MVP scope.
