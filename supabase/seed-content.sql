-- Example of publishing new content to every install without an app update.
-- Copy a block, change the id/data, run it in the SQL Editor. Set published = false to hide.

insert into public.content (id, kind, data) values
('tip_welcome_cloud', 'tip', '{
  "e": "☁️",
  "cat": "Update",
  "title": "Your devices are now in sync",
  "body": "Meals, sleep and training logged on one device appear on the others within seconds.",
  "bg": ["#1e3a8a", "#020617"]
}')
on conflict (id) do update set data = excluded.data, published = true;

insert into public.content (id, kind, data) values
('chicken_karahi_tray', 'recipe', '{
  "name": "Tray Chicken Karahi",
  "emoji": "🍲",
  "bg": ["#b91c1c", "#450a0a"],
  "method": "airfryer",
  "meals": ["dinner"],
  "mins": 22,
  "cost": 16,
  "kcal": 760,
  "protein": 45,
  "tags": ["desi", "spicy", "comfort"],
  "feel": ["ok", "energetic"],
  "desc": "Tomato-heavy karahi made in a foil tray: chicken, tomatoes, ginger and green chilli.",
  "ing": [
    {"id": "chicken_thigh", "q": "250 g"},
    {"id": "tomato", "q": "3"},
    {"id": "garlic_ginger", "q": "1 tsp"},
    {"id": "cumin_chili", "q": "1 tsp"},
    {"id": "naan", "q": "½"}
  ],
  "steps": [
    {"t": "Chop tomatoes into a foil tray with garlic-ginger, chilli, salt and 1 tbsp oil. Air fry 200°C.", "timer": 420},
    {"t": "Add chicken pieces, stir. Air fry 190°C, stirring halfway.", "timer": 780},
    {"t": "Finish with black pepper and serve with warm naan."}
  ]
}')
on conflict (id) do update set data = excluded.data, published = true;
