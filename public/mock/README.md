# Mock wardrobe images

`data/mock-wardrobe.json` expects these files in this folder. Nothing here is loaded
until you run `npx tsx scripts/seedMockWardrobe.ts --confirm`; the script links an
image only if the file exists, so you can add them gradually and re-run it.

**What to look for:** one garment (or pair, for shoes) on its own, no person, no
visible brand logos or text, plain or neutral background, portrait. The wardrobe
cards are 4:5, so aim for about 800 x 1000 px, saved as JPEG. Use photos you have the
right to use (your own, or Unsplash, which needs no attribution).

| File | Used by | Suggested search term |
| --- | --- | --- |
| `tee-white.jpg` | The three white tees (Everlane, Uniqlo, COS) | white t-shirt flat lay |
| `blouse-cream.jpg` | Aritzia silk-blend cowl blouse | cream silk blouse on hanger |
| `sweater-navy.jpg` | Uniqlo merino crew sweater | navy crew neck sweater flat lay |
| `sweater-grey.jpg` | Everlane cashmere crew | grey cashmere sweater folded |
| `cardigan-cream.jpg` | COS chunky wool cardigan | cream chunky knit cardigan |
| `coat-black-wool.jpg` | The two black wool coats (Aritzia, Zara) | black wool coat on hanger |
| `jacket-down-navy.jpg` | Uniqlo ultra light down jacket | navy puffer jacket flat lay |
| `trench-stone.jpg` | Everlane modern trench | beige trench coat on hanger |
| `jeans-blue.jpg` | Levi's 501 jeans | mid wash blue jeans flat lay |
| `jeans-black.jpg` | Madewell perfect vintage jean | washed black jeans flat lay |
| `trousers-grey.jpg` | Aritzia pleated wide-leg trousers | grey pleated wide leg trousers |
| `skirt-navy.jpg` | COS pleated midi skirt | navy pleated midi skirt |
| `pants-black-leggings.jpg` | Lululemon Align pant | black high rise leggings flat lay |
| `dress-black-knit.jpg` | Aritzia sculpt knit midi dress | black knit midi dress on hanger |
| `dress-pink-slip.jpg` | Zara satin slip dress | blush pink satin slip dress |
| `sneakers-white.jpg` | Veja Campo sneakers | white leather sneakers no logo |
| `boots-black-lace.jpg` | Dr. Martens 1460 boots | black leather lace-up boots |
| `boots-brown-chelsea.jpg` | Blundstone Original 500 | brown leather chelsea boots |
| `sandals-brown.jpg` | Birkenstock Arizona sandals | brown suede two-strap sandals |
| `tote-navy.jpg` | Longchamp Le Pliage tote | navy nylon tote bag |
| `bag-black-shoulder.jpg` | Coach Tabby shoulder bag | black leather shoulder bag |
| `backpack-yellow.jpg` | Fjällräven Kånken backpack | yellow mini backpack |
| `sunglasses-black.jpg` | Ray-Ban Wayfarer | black wayfarer sunglasses flat lay |
| `scarf-plaid.jpg` | Frank And Oak plaid scarf | red navy plaid wool scarf |

Three items deliberately have no image (`"image": null`), to show the designed
placeholder card: the Frank And Oak Oxford shirt, the Reformation wrap dress and
the Roots leather belt.

A file name listed above that is missing from this folder is not an error: that item
just shows the placeholder until the file is added and the seed script is re-run.
