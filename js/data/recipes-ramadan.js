// Ramadan collection: suhoor that lasts until sunset, iftar that breaks the fast gently,
// and calorie-dense late meals for someone who still needs to gain weight.
// Same rules as the rest: air fryer or no-cook, halal, supermarket ingredients.
const R = (o) => ({ fav: false, tags: [], feel: ['ok'], ...o });

export const RAMADAN_RECIPES = [
  R({
    id: 'suhoor_oats_dates', name: 'Suhoor Date & Nut Oats', emoji: '🥣', bg: ['#92400e', '#1c1917'],
    method: 'nocook', meals: ['breakfast'], mins: 5, cost: 6, kcal: 640, protein: 26,
    tags: ['suhoor', 'creamy', 'make-ahead', 'slow-energy'], feel: ['ok', 'tired', 'lowappetite'],
    desc: 'Made before bed, eaten half-asleep before dawn. Oats, milk, dates and nuts release energy slowly through the fast.',
    ing: [{ id: 'oats', q: '70 g' }, { id: 'milk', q: '250 ml' }, { id: 'dates', q: '4, chopped' }, { id: 'nuts', q: 'handful' }, { id: 'yogurt', q: '3 tbsp', opt: true }, { id: 'honey', q: '1 tsp', opt: true }],
    steps: [
      { t: 'In a jar, mix oats, milk and yogurt. Stir in chopped dates.' },
      { t: 'Lid on, into the fridge overnight.' },
      { t: 'At suhoor: top with nuts and honey. Drink two glasses of water with it.' },
    ],
  }),
  R({
    id: 'suhoor_egg_paratha_roll', name: 'Suhoor Egg & Cheese Paratha Roll', emoji: '🌯', bg: ['#b45309', '#1c1917'],
    method: 'airfryer', meals: ['breakfast'], mins: 12, cost: 7, kcal: 690, protein: 30,
    tags: ['suhoor', 'desi', 'filling'], feel: ['ok', 'energetic'],
    desc: 'Frozen paratha crisped in the air fryer around a cheesy egg. Protein and fat keep hunger away until afternoon.',
    ing: [{ id: 'shouzhuabing', q: '1' }, { id: 'eggs', q: '2' }, { id: 'cheese', q: '1 slice' }, { id: 'onion', q: '¼, chopped', opt: true }, { id: 'cumin_chili', q: 'pinch', opt: true }],
    steps: [
      { t: 'Air fry the paratha 180°C until puffed.', timer: 240 },
      { t: 'Beat eggs with onion, chili and salt. Pour into a small oiled tin and air fry 170°C.', timer: 360 },
      { t: 'Lay egg and cheese on the paratha, roll up, 1 more minute to melt.', timer: 60 },
    ],
  }),
  R({
    id: 'suhoor_banana_shake', name: 'Big Suhoor Banana-Date Shake', emoji: '🥤', bg: ['#a16207', '#1c1917'],
    method: 'nocook', meals: ['breakfast', 'snack'], mins: 3, cost: 6, kcal: 620, protein: 30,
    tags: ['suhoor', 'drinkable', 'sweet', 'creamy'], feel: ['tired', 'lowappetite'],
    desc: 'When you can’t face food at 4 AM: drink 600 kcal in two minutes. Shaker bottle is enough if the banana is very ripe.',
    ing: [{ id: 'milk', q: '350 ml' }, { id: 'banana', q: '1 ripe' }, { id: 'dates', q: '3' }, { id: 'peanut_butter', q: '1 tbsp' }, { id: 'oats', q: '3 tbsp' }, { id: 'protein_powder', q: '1 scoop', opt: true }],
    steps: [
      { t: 'Mash banana and pitted dates with a fork (or blend everything).' },
      { t: 'Shake with milk, peanut butter and oats until smooth. Drink slowly.' },
    ],
  }),
  R({
    id: 'iftar_date_plate', name: 'Iftar Opener Plate', emoji: '🌙', bg: ['#4c1d95', '#0f0a1e'],
    method: 'nocook', meals: ['dinner', 'snack'], mins: 3, cost: 5, kcal: 320, protein: 9,
    tags: ['iftar', 'sweet', 'quick'], feel: ['tired', 'lowappetite', 'ok'],
    desc: 'The sunnah way to open: dates and water, then a little fruit and yogurt. Gentle on an empty stomach before the main meal.',
    ing: [{ id: 'dates', q: '3' }, { id: 'yogurt', q: '100 g' }, { id: 'banana', q: '½', opt: true }, { id: 'mango', q: 'a few pieces', opt: true }],
    steps: [
      { t: 'Break the fast with 3 dates and a glass of water.' },
      { t: 'A few spoons of yogurt with fruit. Pray, then eat your main meal 15–20 minutes later.' },
    ],
  }),
  R({
    id: 'iftar_chana_chaat', name: 'Iftar Chana Chaat', emoji: '🥗', bg: ['#a21caf', '#1a0520'],
    method: 'nocook', meals: ['dinner', 'snack'], mins: 8, cost: 6, kcal: 420, protein: 17,
    tags: ['iftar', 'desi', 'tangy', 'street-food'], feel: ['ok', 'energetic'],
    desc: 'The iftar table classic. Tinned chickpeas, potato, onion, tomato, lemon and chaat spice — no cooking.',
    ing: [{ id: 'chickpeas', q: '1 tin, drained' }, { id: 'potato', q: '1 small, cooked', opt: true }, { id: 'onion', q: '¼' }, { id: 'tomato', q: '1' }, { id: 'lemon', q: '½' }, { id: 'cumin_chili', q: '1 tsp' }, { id: 'yogurt', q: '2 tbsp', opt: true }],
    steps: [
      { t: 'Rinse chickpeas. Dice onion, tomato and potato (microwave the potato 4 minutes if raw).' },
      { t: 'Toss with lemon, cumin, chili and salt. Top with yogurt and coriander.' },
    ],
  }),
  R({
    id: 'iftar_pakora', name: 'Air-Fryer Veg Pakoras', emoji: '🧅', bg: ['#c2410c', '#1c0a04'],
    method: 'airfryer', meals: ['snack', 'dinner'], mins: 18, cost: 5, kcal: 380, protein: 12,
    tags: ['iftar', 'crispy', 'desi', 'street-food'], feel: ['ok', 'energetic'],
    desc: 'Onion, spinach and potato in spiced batter — crisp without a pan of oil. Use gram flour if you can find it, plain flour + egg if not.',
    ing: [{ id: 'onion', q: '1, sliced' }, { id: 'spinach', q: 'handful', opt: true }, { id: 'potato', q: '1 small, grated' }, { id: 'eggs', q: '1' }, { id: 'cumin_chili', q: '1 tsp' }, { id: 'oil_spray', q: 'spray' }],
    steps: [
      { t: 'Mix vegetables with egg, 4 tbsp gram (or plain) flour, spices and salt until everything is coated and sticky.' },
      { t: 'Drop spoonfuls onto baking paper in the basket, spray with oil. Air fry 190°C.', timer: 480 },
      { t: 'Flip, spray again, 4–5 more minutes until deep golden.', timer: 270 },
    ],
  }),
  R({
    id: 'iftar_chicken_rolls', name: 'Chicken Spring-Roll Wraps', emoji: '🥢', bg: ['#b91c1c', '#1c0505'],
    method: 'airfryer', meals: ['dinner', 'snack'], mins: 20, cost: 12, kcal: 560, protein: 38,
    tags: ['iftar', 'crispy', 'high-protein'], feel: ['ok', 'energetic'],
    desc: 'Tortillas rolled around spiced chicken and cabbage, air-fried until they crackle. Iftar-party energy for one.',
    ing: [{ id: 'cooked_chicken', q: '150 g, shredded' }, { id: 'cabbage', q: '1 cup, shredded' }, { id: 'tortilla', q: '2' }, { id: 'soy_sauce', q: '1 tsp' }, { id: 'cumin_chili', q: 'pinch' }, { id: 'oil_spray', q: 'spray' }],
    steps: [
      { t: 'Mix chicken, cabbage, soy and chili.' },
      { t: 'Roll tightly in tortillas, folding the ends in. Spray all over with oil.' },
      { t: 'Air fry seam-side down 190°C, turn halfway.', timer: 600 },
    ],
  }),
  R({
    id: 'iftar_haleem_cheat', name: 'Quick Chicken Haleem Bowl', emoji: '🍲', bg: ['#78350f', '#1c1004'],
    method: 'airfryer', meals: ['dinner'], mins: 25, cost: 12, kcal: 720, protein: 46,
    tags: ['iftar', 'desi', 'comfort', 'high-protein', 'creamy'], feel: ['ok', 'lowappetite'],
    desc: 'A shortcut haleem: oats and chickpeas mashed with shredded spiced chicken — thick, warming, and very easy to eat a lot of.',
    ing: [{ id: 'cooked_chicken', q: '150 g' }, { id: 'oats', q: '40 g' }, { id: 'chickpeas', q: '½ tin' }, { id: 'curry_paste', q: '1 tbsp' }, { id: 'garlic_ginger', q: '1 tsp' }, { id: 'onion', q: '½, sliced' }, { id: 'lemon', q: '½', opt: true }],
    steps: [
      { t: 'Air fry the sliced onion with a spray of oil 180°C until brown and crisp — this is your topping.', timer: 480 },
      { t: 'In a bowl, microwave oats, chickpeas, curry paste, garlic-ginger and 300 ml water for 4 minutes, stirring halfway.' },
      { t: 'Mash hard with a fork, stir in shredded chicken, heat 1 more minute.' },
      { t: 'Top with crispy onion, lemon and a little butter.' },
    ],
  }),
  R({
    id: 'late_kebab_rice', name: 'Late-Night Kebab Rice Bowl', emoji: '🍛', bg: ['#9a3412', '#1c0904'],
    method: 'airfryer', meals: ['lunch', 'dinner'], mins: 15, cost: 13, kcal: 780, protein: 42,
    tags: ['iftar', 'filling', 'high-protein', 'desi'], feel: ['ok', 'tired'],
    desc: 'The second real meal between iftar and suhoor. Frozen kebabs, instant rice and yogurt — the calories that keep your weight climbing in Ramadan.',
    ing: [{ id: 'kebab_frozen', q: '4' }, { id: 'instant_rice', q: '1 pack' }, { id: 'yogurt', q: '3 tbsp' }, { id: 'cucumber', q: '½' }, { id: 'onion', q: '¼', opt: true }],
    steps: [
      { t: 'Air fry kebabs 190°C, turn halfway.', timer: 600 },
      { t: 'Microwave the rice. Grate cucumber into yogurt with salt for a quick raita.' },
      { t: 'Bowl: rice, kebabs, raita, onion.' },
    ],
  }),
  R({
    id: 'rooh_afza_milk', name: 'Rose Milk with Basil Seeds', emoji: '🌹', bg: ['#be185d', '#1f0512'],
    method: 'nocook', meals: ['snack'], mins: 3, cost: 4, kcal: 300, protein: 11,
    tags: ['iftar', 'drinkable', 'sweet', 'cooling'], feel: ['tired', 'lowappetite'],
    desc: 'Cold milk, rose syrup (or honey and a drop of rose water) and soaked basil or chia seeds. Rehydrates and adds easy calories after the fast.',
    ing: [{ id: 'milk', q: '300 ml, cold' }, { id: 'honey', q: '1 tbsp' }, { id: 'nuts', q: 'a few, chopped', opt: true }],
    steps: [
      { t: 'Soak 1 tsp basil or chia seeds in a little water for 5 minutes (optional).' },
      { t: 'Stir rose syrup — or honey and a drop of rose water — into cold milk. Add the seeds and nuts.' },
    ],
  }),
];
