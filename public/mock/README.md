# Mock wardrobe images

`data/mock-wardrobe.json` expects these files in this folder. The seed script
(`npx tsx scripts/seedMockWardrobe.ts --confirm`) links an image only if the file
exists here, and the demo only uses files listed in `data/mock-images.json`
(serverless functions cannot see `public/`). Add a file here and to that list.

These photos come from Pexels, under a subscribed account. Each was cropped to
the garment and saved as an 800 x 1000 JPEG (4:5, the wardrobe card ratio).
Every closet piece has a photo. `loafers-brown-tan.jpg` is the demo sample item (see `SAMPLE_ITEM` in `src/lib/demo.ts`), not a closet piece.

| File | Used by | Suggested search term |
| --- | --- | --- |
| `bag-corduroy-rust.jpg` | Mango Corduroy Baguette Shoulder Bag | corduroy baguette shoulder bag |
| `bag-woven-tan.jpg` | Massimo Dutti Woven Leather Shoulder Bag | woven leather shoulder bag |
| `belt-suede-brown.jpg` | Mango Suede Belt with Gold Buckle | suede belt with gold buckle |
| `blazer-taupe.jpg` | COS Pinstripe Tailored Blazer | pinstripe tailored blazer |
| `blouse-black-pin.jpg` | Free People Safety-Pin Peplum Blouse | safety-pin peplum blouse |
| `blouse-blue-tie.jpg` | H&M Tie-Front Smocked Blouse | tie-front smocked blouse |
| `cami-navy-satin.jpg` | Aritzia Satin Slip Cami | satin slip cami |
| `cardigan-lilac.jpg` | Uniqlo Fine Knit V-Neck Cardigan | fine knit v-neck cardigan |
| `coat-faux-fur.jpg` | Mango Faux Fur Hooded Jacket | faux fur hooded jacket |
| `coat-grey-wool.jpg` | Aritzia Oversized Double-Breasted Wool Coat | oversized double-breasted wool coat |
| `coat-pinstripe-grey.jpg` | Zara Oversized Pinstripe Long Coat | oversized pinstripe long coat |
| `coat-teddy-red.jpg` | Zara Teddy Faux Shearling Coat | teddy faux shearling coat |
| `dress-pleated-blue.jpg` | Mango Pleated Halter Maxi Dress | pleated halter maxi dress |
| `dress-ruffle-green.jpg` | Mango Ruffle Off-Shoulder Maxi Dress | ruffle off-shoulder maxi dress |
| `dress-slip-green.jpg` | Zara Lace-Trim Velvet Slip Dress | lace-trim velvet slip dress |
| `heels-burgundy-velvet.jpg` | Steve Madden Velvet Ankle-Strap Pumps | velvet ankle-strap pumps |
| `heels-red-tstrap.jpg` | Aldo T-Strap Pointed Heels | t-strap pointed heels |
| `jacket-bomber-rust.jpg` | Uniqlo Lightweight Bomber Jacket | lightweight bomber jacket |
| `jacket-denim-lined.jpg` | Lee Storm Rider Denim Jacket | storm rider denim jacket |
| `jacket-leather-black.jpg` | Zara Faux Leather Bomber Jacket | faux leather bomber jacket |
| `jacket-suede-olive.jpg` | Mango Faux Suede Bomber Jacket | faux suede bomber jacket |
| `jeans-acne-navy.jpg` | Acne Studios Bootcut Raw Denim Jeans | bootcut raw denim jeans |
| `jeans-madewell-light.jpg` | Madewell Perfect Vintage Straight Jeans | perfect vintage straight jeans |
| `jeans-plum.jpg` | Zara Wide-Leg Cotton Jeans | wide-leg cotton jeans |
| `jeans-wide-dark.jpg` | Levi's Ribcage Wide-Leg Jeans | ribcage wide-leg jeans |
| `jeans-wide-light.jpg` | Gap High Rise Wide-Leg Jeans | high rise wide-leg jeans |
| `loafers-brown-dark.jpg` | Everlane The Suede Penny Loafer | the suede penny loafer |
| `loafers-brown-tan.jpg` | Zara Suede Penny Loafers | suede penny loafers |
| `poncho-cream.jpg` | Roots Fringed Knit Poncho | fringed knit poncho |
| `shirt-linen-cream.jpg` | Aritzia Relaxed Linen Shirt | relaxed linen shirt |
| `shirt-linen-yellow.jpg` | Uniqlo Premium Linen Shirt | premium linen shirt |
| `shirt-ruched-green.jpg` | COS Textured Ruched Shirt | textured ruched shirt |
| `shorts-denim.jpg` | Levi's 501 Original Cut-Off Shorts | 501 original cut-off shorts |
| `shorts-gingham.jpg` | Zara Gingham Boxer Shorts | gingham boxer shorts |
| `skirt-bubble-white.jpg` | Aritzia Poplin Bubble Mini Skirt | poplin bubble mini skirt |
| `sweater-brown.jpg` | Everlane Mohair-Blend Crew Sweater | mohair-blend crew sweater |
| `sweater-crochet-cream.jpg` | Anthropologie Open-Knit Cropped Sweater | open-knit cropped sweater |
| `sweater-pink-chunky.jpg` | Everlane Chunky Alpaca Crew Sweater | chunky alpaca crew sweater |
| `sweater-ribbed-cream.jpg` | COS Ribbed Boat-Neck Sweater | ribbed boat-neck sweater |
| `tank-green-ribbed.jpg` | Aritzia Cotton Rib Tank | cotton rib tank |
| `tank-navy.jpg` | Everlane Ribbed Racerback Tank | ribbed racerback tank |
| `tank-silver.jpg` | Mango Metallic Rib Tank | metallic rib tank |
| `tank-tan.jpg` | Gap Cropped Rib Tank | cropped rib tank |
| `tank-white.jpg` | Aritzia Cotton Rib Crop Tank | cotton rib crop tank |
| `tee-black-model.jpg` | Gap Vintage Soft Crew Tee | vintage soft crew tee |
| `tee-black.jpg` | Uniqlo Supima Cotton Crew Neck Tee | supima cotton crew neck tee |
| `tee-white-flat.jpg` | Everlane The Organic Cotton Crew Tee | the organic cotton crew tee |
| `tee-white-hanger.jpg` | COS Boxy Heavyweight Tee | boxy heavyweight tee |
| `top-crochet-red.jpg` | Zara Crochet Halter Top | crochet halter top |
| `top-crochet-striped.jpg` | Mango Striped Crochet Tie Top | striped crochet tie top |
| `trousers-cream.jpg` | Zara Pleated High-Waist Trousers | pleated high-waist trousers |
