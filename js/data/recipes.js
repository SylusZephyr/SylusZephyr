// Every recipe works with only an air fryer / oven, or no cooking at all.
// method: 'airfryer' | 'nocook'. Timers are in seconds. kcal/protein per serving (approx).
// feel: which moods it suits — 'tired' (near-zero effort), 'ok', 'energetic', 'lowappetite'.
const R = (o) => ({ fav: false, tags: [], feel: ['ok'], ...o });

export const RECIPES = [
  // ───────────── BREAKFAST ─────────────
  R({
    id: 'egg_paratha', name: 'Crispy Egg Paratha', emoji: '🫓', bg: ['#f59e0b', '#b45309'],
    method: 'airfryer', meals: ['breakfast'], mins: 12, cost: 6, kcal: 520, protein: 20,
    tags: ['crispy', 'desi', 'savory'], feel: ['ok', 'energetic'],
    desc: 'Your favourite desi breakfast, made with frozen 手抓饼 — golden flaky outside, soft egg inside.',
    ing: [{ id: 'shouzhuabing', q: '1 sheet' }, { id: 'eggs', q: '2' }, { id: 'onion', q: '¼, chopped', opt: true }, { id: 'cumin_chili', q: 'pinch' }, { id: 'cheese', q: '1 slice', opt: true }],
    steps: [
      { t: 'Put the frozen paratha straight in the air fryer (no oil). 200°C.', timer: 300 },
      { t: 'While it cooks, beat 2 eggs with salt, chili and onion in a mug.' },
      { t: 'Pull the basket, fold up the paratha edges into a little boat and pour the egg in. (Or pour egg into a small oven-safe dish next to it.)' },
      { t: 'Back in at 180°C until the egg sets.', timer: 300 },
      { t: 'Add the cheese slice for the last minute if you like. Fold, eat with yogurt and a banana.' },
    ],
  }),
  R({
    id: 'aloo_paratha_cheat', name: 'Cheat Aloo-Cheese Paratha', emoji: '🥔', bg: ['#eab308', '#a16207'],
    method: 'airfryer', meals: ['breakfast', 'dinner'], mins: 15, cost: 7, kcal: 610, protein: 16,
    tags: ['crispy', 'desi', 'comfort'], feel: ['ok', 'energetic'],
    desc: 'Microwave-free mash: air-fry a sliced potato, smash it with masala, sandwich it between two parathas.',
    ing: [{ id: 'shouzhuabing', q: '2 sheets' }, { id: 'potato', q: '1 small, thin slices' }, { id: 'cheese', q: '1 slice' }, { id: 'cumin_chili', q: '½ tsp' }],
    steps: [
      { t: 'Air fry thin potato slices with a spray of oil, 200°C until soft.', timer: 480 },
      { t: 'Smash them with a fork, salt, cumin and chili.' },
      { t: 'Spread on one frozen paratha, add cheese, top with the second paratha.' },
      { t: 'Air fry 200°C, flip halfway.', timer: 480 },
      { t: 'Cut in quarters. Great with yogurt or ketchup.' },
    ],
  }),
  R({
    id: 'egg_muffins', name: 'Masala Egg Muffins', emoji: '🧁', bg: ['#fb923c', '#c2410c'],
    method: 'airfryer', meals: ['breakfast', 'snack'], mins: 14, cost: 5, kcal: 280, protein: 19,
    tags: ['savory', 'desi', 'high-protein'], feel: ['ok'],
    desc: 'Desi omelette in muffin form. Use silicone cups or a small foil tray.',
    ing: [{ id: 'eggs', q: '3' }, { id: 'onion', q: '¼' }, { id: 'tomato', q: '½' }, { id: 'pepper', q: '¼', opt: true }, { id: 'cheese', q: 'handful', opt: true }],
    steps: [
      { t: 'Chop onion/tomato small (kitchen scissors in a mug = no board to wash).' },
      { t: 'Beat eggs with salt, chili, the veg and cheese.' },
      { t: 'Pour into 3–4 silicone cups. Air fry 160°C until puffed and set.', timer: 600 },
      { t: 'Eat 2 now, keep the rest in the fridge for tomorrow.' },
    ],
  }),
  R({
    id: 'overnight_oats', name: 'Peanut Butter Banana Overnight Oats', emoji: '🥣', bg: ['#a78bfa', '#6d28d9'],
    method: 'nocook', meals: ['breakfast', 'snack'], mins: 3, cost: 5, kcal: 560, protein: 22,
    tags: ['creamy', 'sweet', 'prep-ahead'], feel: ['tired', 'lowappetite', 'ok'],
    desc: 'Make it before bed in a jar, grab it when you wake. Zero cooking, one spoon.',
    ing: [{ id: 'oats', q: '½ cup' }, { id: 'milk', q: '¾ cup' }, { id: 'yogurt', q: '3 tbsp' }, { id: 'peanut_butter', q: '1 tbsp' }, { id: 'banana', q: '1' }, { id: 'honey', q: '1 tsp', opt: true }],
    steps: [
      { t: 'In a jar or bowl mix oats, milk, yogurt and peanut butter.' },
      { t: 'Slice half the banana in. Lid on, fridge overnight (or at least 1 hour).' },
      { t: 'Top with the rest of the banana and honey. Eat cold.' },
    ],
  }),
  R({
    id: 'yogurt_bowl', name: 'Honey Granola Yogurt Bowl', emoji: '🍯', bg: ['#fbbf24', '#d97706'],
    method: 'nocook', meals: ['breakfast', 'snack'], mins: 2, cost: 6, kcal: 450, protein: 20,
    tags: ['creamy', 'crunchy', 'sweet'], feel: ['tired', 'lowappetite'],
    desc: 'Creamy + crunchy in 2 minutes. Add dates for iron and energy.',
    ing: [{ id: 'yogurt', q: '200 g' }, { id: 'granola', q: '40 g' }, { id: 'banana', q: '1', opt: true }, { id: 'dates', q: '3', opt: true }, { id: 'honey', q: '1 tsp' }],
    steps: [{ t: 'Yogurt in a bowl, granola on top, sliced banana/dates, drizzle honey. Done.' }],
  }),
  R({
    id: 'naan_egg_cheese', name: 'Naan Egg & Cheese Melt', emoji: '🥯', bg: ['#f97316', '#9a3412'],
    method: 'airfryer', meals: ['breakfast', 'lunch'], mins: 10, cost: 7, kcal: 560, protein: 24,
    tags: ['crispy', 'savory'], feel: ['ok'],
    desc: 'Xinjiang naan gets super crispy in the air fryer. Egg cracked on top like a pizza.',
    ing: [{ id: 'naan', q: '½ large' }, { id: 'eggs', q: '2' }, { id: 'cheese', q: 'handful' }, { id: 'cumin_chili', q: 'pinch' }],
    steps: [
      { t: 'Press a dip in the naan, crack eggs on it, scatter cheese, cumin, chili.' },
      { t: 'Air fry 180°C until the egg white is set.', timer: 420 },
    ],
  }),
  R({
    id: 'french_toast', name: 'Air-Fryer French Toast Sticks', emoji: '🍞', bg: ['#fcd34d', '#b45309'],
    method: 'airfryer', meals: ['breakfast', 'snack'], mins: 12, cost: 4, kcal: 480, protein: 18,
    tags: ['crispy', 'sweet'], feel: ['ok', 'energetic'],
    desc: 'Crispy edges, soft custardy inside. Dip in honey or peanut butter.',
    ing: [{ id: 'bread', q: '3 slices' }, { id: 'eggs', q: '2' }, { id: 'milk', q: '3 tbsp' }, { id: 'honey', q: 'to dip' }],
    steps: [
      { t: 'Cut bread into sticks. Beat eggs + milk + pinch of sugar in a shallow bowl.' },
      { t: 'Dip sticks, lay in a lined basket.' },
      { t: 'Air fry 180°C, flip halfway.', timer: 480 },
    ],
  }),

  // ───────────── LUNCH (wraps & sandwiches) ─────────────
  R({
    id: 'chicken_cheese_wrap', name: 'Chicken-Cheese Crunch Wrap', emoji: '🌯', bg: ['#ef4444', '#991b1b'],
    method: 'airfryer', meals: ['lunch', 'dinner'], mins: 10, cost: 12, kcal: 680, protein: 42,
    tags: ['crispy', 'cheesy', 'high-protein'], feel: ['ok', 'tired'],
    desc: 'Ready-cooked chicken + cheese folded into a tortilla and toasted golden. Your lunch default.',
    ing: [{ id: 'tortilla', q: '1 large' }, { id: 'cooked_chicken', q: '1 pack' }, { id: 'cheese', q: '2 slices' }, { id: 'lettuce', q: 'leaf', opt: true }, { id: 'mayo', q: '1 tbsp' }, { id: 'ketchup', q: 'squeeze' }],
    steps: [
      { t: 'Tear chicken onto the tortilla, add cheese, sauce and lettuce.' },
      { t: 'Fold into a tight parcel, seam side down. Spray a little oil.' },
      { t: 'Air fry 190°C until golden and the cheese melts.', timer: 360 },
    ],
  }),
  R({
    id: 'tikka_wrap', name: 'Chicken Tikka Wrap', emoji: '🔥', bg: ['#dc2626', '#7f1d1d'],
    method: 'airfryer', meals: ['lunch', 'dinner'], mins: 20, cost: 14, kcal: 650, protein: 45,
    tags: ['spicy', 'desi', 'high-protein'], feel: ['ok', 'energetic'],
    desc: 'Yogurt-marinated chicken thigh with tikka masala, charred in the air fryer.',
    ing: [{ id: 'chicken_thigh', q: '200 g' }, { id: 'yogurt', q: '2 tbsp' }, { id: 'tikka_masala', q: '1 tbsp' }, { id: 'garlic_ginger', q: '1 tsp' }, { id: 'tortilla', q: '1–2' }, { id: 'onion', q: 'sliced' }, { id: 'lemon', q: 'squeeze', opt: true }],
    steps: [
      { t: 'In a zip bag: chicken pieces, yogurt, masala, garlic-ginger, salt. Squish. (10 min or overnight.)' },
      { t: 'Air fry 200°C, shake halfway.', timer: 720 },
      { t: 'Warm the tortilla 1 min in the air fryer.', timer: 60 },
      { t: 'Fill with chicken, onion, lemon and a spoon of yogurt. Roll up.' },
    ],
  }),
  R({
    id: 'tuna_melt', name: 'Tuna Melt Toastie', emoji: '🥪', bg: ['#0ea5e9', '#075985'],
    method: 'airfryer', meals: ['lunch'], mins: 8, cost: 10, kcal: 560, protein: 34,
    tags: ['cheesy', 'crispy', 'high-protein'], feel: ['tired', 'ok'],
    desc: 'Canned tuna + mayo + cheese between bread, crisped in 6 minutes.',
    ing: [{ id: 'tuna_can', q: '1' }, { id: 'mayo', q: '1 tbsp' }, { id: 'bread', q: '2 slices' }, { id: 'cheese', q: '1–2 slices' }, { id: 'cumin_chili', q: 'pinch', opt: true }],
    steps: [
      { t: 'Mix drained tuna with mayo and chili in the can itself (fewer dishes!).' },
      { t: 'Build the sandwich with cheese. Brush outside with a little butter.' },
      { t: 'Air fry 180°C, flip halfway.', timer: 360 },
    ],
  }),
  R({
    id: 'kebab_naan', name: 'Seekh Kebab Naan Roll', emoji: '🍢', bg: ['#b91c1c', '#450a0a'],
    method: 'airfryer', meals: ['lunch', 'dinner'], mins: 12, cost: 15, kcal: 720, protein: 38,
    tags: ['spicy', 'smoky', 'desi'], feel: ['ok', 'energetic'],
    desc: 'Frozen halal skewers from the 清真 counter, with onion and yogurt in warm naan.',
    ing: [{ id: 'kebab_frozen', q: '5 skewers' }, { id: 'naan', q: '½' }, { id: 'onion', q: 'sliced' }, { id: 'yogurt', q: '2 tbsp' }, { id: 'cumin_chili', q: 'sprinkle' }],
    steps: [
      { t: 'Air fry frozen skewers 200°C, turn halfway.', timer: 600 },
      { t: 'Add naan in the last 2 minutes to warm.' },
      { t: 'Slide meat off the sticks into the naan, add onion, yogurt and cumin.' },
    ],
  }),
  R({
    id: 'egg_mayo_sandwich', name: 'Egg Mayo Sandwich (no stove)', emoji: '🥚', bg: ['#facc15', '#854d0e'],
    method: 'airfryer', meals: ['lunch', 'snack'], mins: 16, cost: 5, kcal: 480, protein: 22,
    tags: ['creamy', 'prep-ahead'], feel: ['ok'],
    desc: 'Air-fryer "boiled" eggs — 15 minutes, no water. Make 6 and keep in the fridge.',
    ing: [{ id: 'eggs', q: '3 (make 6)' }, { id: 'mayo', q: '1 tbsp' }, { id: 'bread', q: '2 slices' }, { id: 'lettuce', q: 'leaf', opt: true }],
    steps: [
      { t: 'Put whole eggs straight in the air fryer basket. 130°C for hard-boiled.', timer: 900 },
      { t: 'Drop into cold water for 2 minutes, peel.', timer: 120 },
      { t: 'Mash 2 eggs with mayo, salt, pepper. Spread on bread. Keep the rest for snacks.' },
    ],
  }),
  R({
    id: 'chicken_pizza_naan', name: 'Chicken Tikka Naan Pizza', emoji: '🍕', bg: ['#f43f5e', '#881337'],
    method: 'airfryer', meals: ['lunch', 'dinner'], mins: 10, cost: 13, kcal: 740, protein: 40,
    tags: ['cheesy', 'crispy', 'comfort'], feel: ['ok', 'energetic'],
    desc: 'Naan base, ketchup-chili sauce, cooked chicken, lots of mozzarella.',
    ing: [{ id: 'naan', q: '½ large' }, { id: 'ketchup', q: '2 tbsp' }, { id: 'cooked_chicken', q: '1 pack' }, { id: 'cheese', q: '2 handfuls' }, { id: 'pepper', q: '¼', opt: true }, { id: 'onion', q: '¼', opt: true }],
    steps: [
      { t: 'Spread sauce on naan, add chicken, veg, cheese.' },
      { t: 'Air fry 180°C until bubbling.', timer: 420 },
    ],
  }),

  // ───────────── DINNER (curry-style & mains) ─────────────
  R({
    id: 'airfryer_chicken_curry', name: 'Shortcut Air-Fryer Chicken Curry', emoji: '🍛', bg: ['#ea580c', '#7c2d12'],
    method: 'airfryer', meals: ['dinner'], mins: 22, cost: 16, kcal: 780, protein: 44,
    tags: ['desi', 'comfort', 'spicy'], feel: ['ok', 'energetic'],
    desc: 'Chicken roasted in a foil tray with tomato, onion, masala and yogurt — tastes like a karahi. Eat with naan or paratha.',
    ing: [{ id: 'chicken_thigh', q: '250 g' }, { id: 'onion', q: '1' }, { id: 'tomato', q: '2' }, { id: 'curry_paste', q: '1½ tbsp' }, { id: 'garlic_ginger', q: '1 tsp' }, { id: 'yogurt', q: '3 tbsp' }, { id: 'shouzhuabing', q: '2 (as roti)' }],
    steps: [
      { t: 'In a foil tray / oven dish: sliced onion + chopped tomato + 1 tbsp oil + curry powder + garlic-ginger + salt. Mix.' },
      { t: 'Air fry 200°C to soften the masala.', timer: 360 },
      { t: 'Add chicken pieces, stir to coat. Back in at 190°C, stir halfway.', timer: 720 },
      { t: 'Stir in yogurt (and splash of water for gravy). 2 more minutes.', timer: 120 },
      { t: 'Air fry 2 parathas (5 min) while it rests, or warm naan. Eat from the tray = less washing.', timer: 300 },
    ],
  }),
  R({
    id: 'tandoori_thighs', name: 'Tandoori Chicken Thighs', emoji: '🍗', bg: ['#dc2626', '#9a3412'],
    method: 'airfryer', meals: ['dinner', 'lunch'], mins: 20, cost: 14, kcal: 520, protein: 46,
    tags: ['smoky', 'desi', 'high-protein'], feel: ['ok', 'energetic'],
    desc: 'Marinate in the bag in the morning, cook in 15 minutes at night.',
    ing: [{ id: 'chicken_thigh', q: '250 g' }, { id: 'yogurt', q: '3 tbsp' }, { id: 'tikka_masala', q: '1 tbsp' }, { id: 'lemon', q: '½' }, { id: 'garlic_ginger', q: '1 tsp' }],
    steps: [
      { t: 'Bag: chicken, yogurt, masala, lemon, garlic-ginger, salt. Massage. Fridge.' },
      { t: 'Air fry 200°C, flip at halfway.', timer: 900 },
      { t: 'Serve with instant rice + cucumber raita (yogurt + cucumber + salt).' },
    ],
  }),
  R({
    id: 'chapli_patties', name: 'Chapli-Style Beef Patties', emoji: '🥩', bg: ['#9f1239', '#4c0519'],
    method: 'airfryer', meals: ['dinner', 'lunch'], mins: 18, cost: 18, kcal: 690, protein: 38,
    tags: ['crispy', 'desi', 'spicy'], feel: ['energetic'],
    desc: 'Beef mince with onion, tomato, chili and cumin, pressed flat and air-fried crispy.',
    ing: [{ id: 'beef_mince', q: '200 g' }, { id: 'onion', q: '½' }, { id: 'tomato', q: '½' }, { id: 'cumin_chili', q: '1 tsp' }, { id: 'eggs', q: '1' }, { id: 'naan', q: '½' }],
    steps: [
      { t: 'Mix mince, finely chopped onion & tomato, egg, cumin, chili, salt (use your hand in a bag).' },
      { t: 'Press into 2–3 thin patties on baking paper.' },
      { t: 'Air fry 200°C, flip halfway.', timer: 720 },
      { t: 'Serve in naan with yogurt.' },
    ],
  }),
  R({
    id: 'masala_fish', name: 'Crispy Masala Fish & Chips', emoji: '🐟', bg: ['#0284c7', '#0c4a6e'],
    method: 'airfryer', meals: ['dinner'], mins: 20, cost: 15, kcal: 640, protein: 36,
    tags: ['crispy', 'desi'], feel: ['ok'],
    desc: 'Lahori-style spiced fish with frozen fries, all in one basket.',
    ing: [{ id: 'fish_fillet', q: '200 g' }, { id: 'tikka_masala', q: '1 tsp' }, { id: 'lemon', q: '½' }, { id: 'frozen_fries', q: '2 handfuls' }, { id: 'oil_spray', q: 'spray' }],
    steps: [
      { t: 'Fries in first, 200°C.', timer: 480 },
      { t: 'Rub fish with masala, salt, lemon. Add to basket on paper next to fries, spray oil.' },
      { t: '200°C until fish flakes.', timer: 540 },
    ],
  }),
  R({
    id: 'honey_salmon', name: 'Honey-Soy Salmon & Broccoli', emoji: '🍣', bg: ['#fb7185', '#9f1239'],
    method: 'airfryer', meals: ['dinner'], mins: 14, cost: 28, kcal: 560, protein: 34,
    tags: ['omega-3', 'light'], feel: ['ok'],
    desc: 'Omega-3 rich. Salmon and broccoli cook together in 10 minutes.',
    ing: [{ id: 'salmon', q: '1 fillet' }, { id: 'honey', q: '1 tsp' }, { id: 'soy_sauce', q: '1 tbsp' }, { id: 'garlic_ginger', q: '½ tsp' }, { id: 'broccoli', q: 'handful' }, { id: 'instant_rice', q: '1 bowl' }],
    steps: [
      { t: 'Mix honey, soy, garlic-ginger. Brush on salmon.' },
      { t: 'Salmon + broccoli florets (sprayed with oil) in the basket. 200°C.', timer: 600 },
      { t: 'Heat the instant rice (follow the pack — self-heating or kettle water).' },
    ],
  }),
  R({
    id: 'lamb_skewers_rice', name: 'Cumin Lamb Bites + Rice', emoji: '🍖', bg: ['#a16207', '#422006'],
    method: 'airfryer', meals: ['dinner'], mins: 18, cost: 25, kcal: 760, protein: 40,
    tags: ['spicy', 'smoky', 'iron-rich'], feel: ['energetic'],
    desc: 'Xinjiang-style 孜然羊肉 — iron-rich and full of flavour.',
    ing: [{ id: 'lamb', q: '200 g' }, { id: 'cumin_chili', q: '1½ tsp' }, { id: 'onion', q: '½' }, { id: 'oil_spray', q: 'spray' }, { id: 'instant_rice', q: '1 bowl' }],
    steps: [
      { t: 'Toss lamb cubes with cumin, chili, salt and oil.' },
      { t: 'Air fry 200°C with sliced onion, shake halfway.', timer: 720 },
      { t: 'Serve over rice.' },
    ],
  }),
  R({
    id: 'chickpea_chaat', name: 'Crispy Chana Chaat Bowl', emoji: '🫘', bg: ['#65a30d', '#365314'],
    method: 'airfryer', meals: ['lunch', 'snack', 'dinner'], mins: 15, cost: 8, kcal: 470, protein: 18,
    tags: ['crispy', 'desi', 'tangy'], feel: ['ok'],
    desc: 'Air-fried chickpeas + potato with yogurt, onion, tomato, lemon and chili.',
    ing: [{ id: 'chickpeas', q: '1 can' }, { id: 'potato', q: '1 small', opt: true }, { id: 'yogurt', q: '3 tbsp' }, { id: 'onion', q: '¼' }, { id: 'tomato', q: '½' }, { id: 'lemon', q: '½' }, { id: 'cumin_chili', q: 'pinch' }],
    steps: [
      { t: 'Drain + pat chickpeas dry; potato in small cubes. Spray oil, salt.' },
      { t: 'Air fry 200°C, shake twice.', timer: 900 },
      { t: 'Bowl: chickpeas, potato, onion, tomato, yogurt, lemon, chili, cumin.' },
    ],
  }),
  R({
    id: 'tray_bake', name: 'One-Tray Chicken & Potato Roast', emoji: '🥘', bg: ['#d97706', '#78350f'],
    method: 'airfryer', meals: ['dinner'], mins: 25, cost: 14, kcal: 720, protein: 42,
    tags: ['comfort', 'one-tray'], feel: ['ok'],
    desc: 'Everything in one basket: chicken, potato, onion, pepper. Only the basket to wash.',
    ing: [{ id: 'chicken_thigh', q: '250 g' }, { id: 'potato', q: '1' }, { id: 'onion', q: '½' }, { id: 'pepper', q: '½' }, { id: 'tikka_masala', q: '1 tsp' }, { id: 'oil_spray', q: 'spray' }],
    steps: [
      { t: 'Potato chunks in first, spray oil, salt. 200°C.', timer: 600 },
      { t: 'Add chicken, onion, pepper with masala. 200°C, shake halfway.', timer: 780 },
    ],
  }),
  R({
    id: 'paneer_tikka', name: 'Tofu / Paneer Tikka', emoji: '🧈', bg: ['#f59e0b', '#92400e'],
    method: 'airfryer', meals: ['dinner', 'snack'], mins: 18, cost: 7, kcal: 420, protein: 26,
    tags: ['desi', 'smoky'], feel: ['ok'],
    desc: 'Firm 老豆腐 takes tikka marinade beautifully — cheap protein.',
    ing: [{ id: 'paneer', q: '1 block' }, { id: 'yogurt', q: '2 tbsp' }, { id: 'tikka_masala', q: '1 tsp' }, { id: 'pepper', q: '½' }, { id: 'onion', q: '½' }],
    steps: [
      { t: 'Press tofu with paper towel. Cut cubes. Coat in yogurt + masala + salt with pepper and onion.' },
      { t: 'Air fry 200°C, shake halfway.', timer: 780 },
    ],
  }),
  R({
    id: 'sweet_potato_loaded', name: 'Loaded Sweet Potato', emoji: '🍠', bg: ['#ea580c', '#431407'],
    method: 'airfryer', meals: ['dinner', 'lunch'], mins: 35, cost: 10, kcal: 610, protein: 30,
    tags: ['comfort', 'creamy'], feel: ['tired'],
    desc: 'Put it in, forget about it. Top with chicken, cheese and yogurt.',
    ing: [{ id: 'sweet_potato', q: '1 large' }, { id: 'cooked_chicken', q: '1 pack' }, { id: 'cheese', q: 'handful' }, { id: 'yogurt', q: '2 tbsp' }],
    steps: [
      { t: 'Poke the sweet potato with a fork. Air fry 200°C.', timer: 1800 },
      { t: 'Split open, add chicken and cheese, 2 more minutes.', timer: 120 },
      { t: 'Top with yogurt, salt, chili.' },
    ],
  }),

  // ───────────── SNACKS & SHAKES (no blender needed) ─────────────
  R({
    id: 'shaker_smoothie', name: 'Banana PB "Smoothie" (no blender)', emoji: '🥤', bg: ['#a855f7', '#581c87'],
    method: 'nocook', meals: ['snack', 'breakfast'], mins: 3, cost: 5, kcal: 450, protein: 18,
    tags: ['creamy', 'sweet', 'drinkable'], feel: ['tired', 'lowappetite'],
    desc: 'Mash a very ripe banana in a bottle, add milk, oats, peanut butter — shake hard. Drinkable calories when you are not hungry.',
    ing: [{ id: 'banana', q: '1 very ripe' }, { id: 'milk', q: '300 ml' }, { id: 'oats', q: '3 tbsp' }, { id: 'peanut_butter', q: '1 tbsp' }, { id: 'honey', q: '1 tsp', opt: true }],
    steps: [
      { t: 'Mash banana with a fork in a mug until totally smooth.' },
      { t: 'Scrape into a bottle with milk, oats (instant), peanut butter, honey.' },
      { t: 'Lid on, shake 30 seconds like you mean it.', timer: 30 },
      { t: 'Tip: a ¥60 portable USB blender from Taobao (便携榨汁杯) makes this silky.' },
    ],
  }),
  R({
    id: 'protein_milk_dates', name: 'Protein Milk + Dates + Nuts', emoji: '🌴', bg: ['#92400e', '#451a03'],
    method: 'nocook', meals: ['snack'], mins: 0, cost: 8, kcal: 380, protein: 20,
    tags: ['grab-and-go'], feel: ['tired', 'lowappetite'],
    desc: 'The zero-effort energy snack. Keep these three in your bag.',
    ing: [{ id: 'protein_milk', q: '1 bottle' }, { id: 'dates', q: '4' }, { id: 'nuts', q: '1 pack' }],
    steps: [{ t: 'Open. Eat. That counts as a meal opportunity ✔.' }],
  }),
  R({
    id: 'masala_fries', name: 'Masala Fries + Egg', emoji: '🍟', bg: ['#facc15', '#a16207'],
    method: 'airfryer', meals: ['snack', 'lunch'], mins: 15, cost: 5, kcal: 520, protein: 14,
    tags: ['crispy', 'desi', 'comfort'], feel: ['ok', 'tired'],
    desc: 'Frozen fries + chaat masala vibes. Add an air-fryer egg for protein.',
    ing: [{ id: 'frozen_fries', q: '2 handfuls' }, { id: 'cumin_chili', q: '½ tsp' }, { id: 'eggs', q: '1–2' }, { id: 'ketchup', q: 'dip' }],
    steps: [
      { t: 'Fries + whole eggs in basket. 180°C.', timer: 840 },
      { t: 'Toss fries with cumin, chili, salt. Peel eggs.' },
    ],
  }),
  R({
    id: 'wings', name: 'Crispy Spicy Wings', emoji: '🍗', bg: ['#ef4444', '#7f1d1d'],
    method: 'airfryer', meals: ['snack', 'dinner'], mins: 22, cost: 16, kcal: 600, protein: 40,
    tags: ['crispy', 'spicy'], feel: ['energetic'],
    desc: 'Halal wings, cumin-chili crust, no oil needed.',
    ing: [{ id: 'chicken_wings', q: '6–8' }, { id: 'cumin_chili', q: '1 tsp' }, { id: 'soy_sauce', q: '1 tbsp' }, { id: 'honey', q: '1 tsp', opt: true }],
    steps: [
      { t: 'Pat wings dry, toss with soy, cumin, chili, salt.' },
      { t: 'Air fry 200°C, flip halfway.', timer: 1200 },
      { t: 'Optional: brush with honey for the last 2 min.' },
    ],
  }),
  R({
    id: 'samosa_plate', name: 'Samosa / Spring Roll Plate', emoji: '🥟', bg: ['#d97706', '#78350f'],
    method: 'airfryer', meals: ['snack'], mins: 12, cost: 8, kcal: 420, protein: 12,
    tags: ['crispy', 'desi', 'comfort'], feel: ['tired', 'ok'],
    desc: 'Frozen and ready. Serve with yogurt-mint or ketchup.',
    ing: [{ id: 'frozen_samosa', q: '4–6' }, { id: 'yogurt', q: 'dip' }],
    steps: [{ t: 'Air fry from frozen 190°C, shake halfway.', timer: 600 }],
  }),
  R({
    id: 'apple_pb', name: 'Apple + Peanut Butter + Cheese', emoji: '🍎', bg: ['#dc2626', '#14532d'],
    method: 'nocook', meals: ['snack'], mins: 2, cost: 5, kcal: 380, protein: 14,
    tags: ['crunchy', 'grab-and-go'], feel: ['tired', 'lowappetite'],
    desc: 'Crunchy, sweet, salty. Two minutes.',
    ing: [{ id: 'apple', q: '1' }, { id: 'peanut_butter', q: '2 tbsp' }, { id: 'cheese', q: '1 slice', opt: true }],
    steps: [{ t: 'Slice apple, dip in peanut butter. Cheese on the side.' }],
  }),
  R({
    id: 'choc_banana_oats', name: 'Chocolate Banana Baked Oats', emoji: '🍫', bg: ['#7c2d12', '#1c0a00'],
    method: 'airfryer', meals: ['breakfast', 'snack'], mins: 15, cost: 6, kcal: 520, protein: 20,
    tags: ['sweet', 'comfort'], feel: ['ok', 'lowappetite'],
    desc: 'Tastes like a brownie, it is actually oats, egg and banana.',
    ing: [{ id: 'oats', q: '½ cup' }, { id: 'banana', q: '1' }, { id: 'eggs', q: '1' }, { id: 'milk', q: '¼ cup' }, { id: 'chocolate', q: '2 squares' }],
    steps: [
      { t: 'Mash banana in an oven-safe mug/ramekin. Mix in egg, milk, oats.' },
      { t: 'Push chocolate squares into the middle.' },
      { t: 'Air fry 170°C.', timer: 720 },
    ],
  }),
  R({
    id: 'avocado_egg_toast', name: 'Avocado Egg Toast', emoji: '🥑', bg: ['#16a34a', '#14532d'],
    method: 'airfryer', meals: ['breakfast', 'lunch'], mins: 10, cost: 9, kcal: 470, protein: 18,
    tags: ['creamy', 'crispy'], feel: ['ok'],
    desc: 'Crispy toast, smashed avocado, chili flakes and an air-fryer egg.',
    ing: [{ id: 'bread', q: '2 slices' }, { id: 'avocado', q: '1' }, { id: 'eggs', q: '2' }, { id: 'lemon', q: 'squeeze' }, { id: 'cumin_chili', q: 'pinch' }],
    steps: [
      { t: 'Eggs in small foil cups (crack in) + bread in basket. 180°C.', timer: 360 },
      { t: 'Smash avocado with lemon and salt, spread, top with eggs and chili.' },
    ],
  }),
  R({
    id: 'nugget_wrap', name: 'Lazy Nugget Wrap', emoji: '🌮', bg: ['#f59e0b', '#7c2d12'],
    method: 'airfryer', meals: ['lunch', 'dinner', 'snack'], mins: 12, cost: 8, kcal: 620, protein: 28,
    tags: ['crispy', 'comfort'], feel: ['tired'],
    desc: 'For the days when you can barely move: frozen nuggets, tortilla, sauce. 3 actions.',
    ing: [{ id: 'nuggets', q: '6' }, { id: 'tortilla', q: '1' }, { id: 'mayo', q: '1 tbsp' }, { id: 'ketchup', q: '1 tbsp' }, { id: 'lettuce', q: 'leaf', opt: true }],
    steps: [
      { t: 'Air fry nuggets from frozen 200°C.', timer: 600 },
      { t: 'Add tortilla for the last 30 seconds.' },
      { t: 'Wrap with sauces.' },
    ],
  }),
];

// Halal delivery ideas for Meituan 美团 / Ele.me 饿了么. Tip: search with 清真 and filter by rating.
export const DELIVERY = [
  { id: 'd_lamian', name: 'Lanzhou beef noodles', zh: '兰州牛肉拉面 (加蛋加肉)', emoji: '🍜', cost: 25, kcal: 750, protein: 35, tip: 'Ask for 加肉 (extra beef) + 加蛋 (egg) for protein.' },
  { id: 'd_dapanji', name: 'Xinjiang big-plate chicken', zh: '新疆大盘鸡 + 皮带面', emoji: '🍗', cost: 45, kcal: 900, protein: 50, tip: 'Closest thing to chicken curry. Usually feeds 2 — save half for tomorrow.' },
  { id: 'd_polo', name: 'Uyghur polo (pilaf)', zh: '新疆手抓饭', emoji: '🍚', cost: 35, kcal: 850, protein: 30, tip: 'Lamb pilau with carrots — very close to desi pulao.' },
  { id: 'd_samsa', name: 'Baked samsa', zh: '烤包子', emoji: '🥟', cost: 20, kcal: 600, protein: 22, tip: 'Lamb-filled baked pastry. Order 3 + yogurt (酸奶).' },
  { id: 'd_kebab', name: 'Lamb skewers + naan', zh: '红柳烤肉 / 羊肉串 + 馕', emoji: '🍢', cost: 40, kcal: 800, protein: 45, tip: 'Pick 清真 BBQ shops. Ask for less salt.' },
  { id: 'd_laghman', name: 'Laghman (hand-pulled noodles)', zh: '新疆拌面 (过油肉)', emoji: '🍝', cost: 30, kcal: 820, protein: 32, tip: 'Saucy noodles with meat & veg — big portion.' },
  { id: 'd_indian', name: 'Indian / Pakistani restaurant', zh: '印度餐厅 (咖喱鸡 + 馕)', emoji: '🍛', cost: 70, kcal: 1000, protein: 45, tip: 'Big cities have halal Indian places on Meituan. Chicken karahi/curry + naan.' },
  { id: 'd_shawarma', name: 'Shawarma / Turkish', zh: '土耳其烤肉卷 / 沙威玛', emoji: '🌯', cost: 35, kcal: 700, protein: 35, tip: 'Basically your favourite wrap — order 2 and keep one.' },
];

export const RECIPE = Object.fromEntries(RECIPES.map((r) => [r.id, r]));
