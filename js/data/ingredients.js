// Ingredients common in Chinese supermarkets (Hema 盒马, RT-Mart 大润发, Walmart, Carrefour,
// halal 清真 shops) and on Taobao / Meituan Grocery. Prices are rough CNY guides.
export const INGREDIENTS = [
  // Protein
  { id: 'eggs', name: 'Eggs', zh: '鸡蛋', e: '🥚', cat: 'Protein', price: 15, unit: '10 pcs' },
  { id: 'chicken_thigh', name: 'Chicken thighs (boneless)', zh: '清真去骨鸡腿肉', e: '🍗', cat: 'Protein', price: 25, unit: '500 g' },
  { id: 'chicken_breast', name: 'Chicken breast', zh: '清真鸡胸肉', e: '🐔', cat: 'Protein', price: 18, unit: '500 g' },
  { id: 'chicken_wings', name: 'Chicken wings', zh: '清真鸡翅中', e: '🍗', cat: 'Protein', price: 30, unit: '500 g' },
  { id: 'cooked_chicken', name: 'Ready-cooked chicken', zh: '即食鸡胸肉', e: '🥡', cat: 'Protein', price: 8, unit: '100 g pack' },
  { id: 'beef_mince', name: 'Beef mince', zh: '清真牛肉馅', e: '🥩', cat: 'Protein', price: 35, unit: '500 g' },
  { id: 'lamb', name: 'Lamb cubes', zh: '清真羊肉块', e: '🍖', cat: 'Protein', price: 50, unit: '500 g' },
  { id: 'fish_fillet', name: 'Fish fillet (basa/cod)', zh: '巴沙鱼柳', e: '🐟', cat: 'Protein', price: 20, unit: '400 g' },
  { id: 'salmon', name: 'Salmon fillet', zh: '三文鱼', e: '🍣', cat: 'Protein', price: 45, unit: '250 g' },
  { id: 'tuna_can', name: 'Canned tuna', zh: '金枪鱼罐头', e: '🥫', cat: 'Protein', price: 12, unit: 'can' },
  { id: 'paneer', name: 'Firm tofu / paneer', zh: '老豆腐', e: '🧈', cat: 'Protein', price: 5, unit: 'block' },
  { id: 'chickpeas', name: 'Canned chickpeas', zh: '鹰嘴豆罐头', e: '🫘', cat: 'Protein', price: 12, unit: 'can' },
  { id: 'kebab_frozen', name: 'Frozen halal kebabs / skewers', zh: '清真羊肉串 / 牛肉串', e: '🍢', cat: 'Protein', price: 40, unit: '20 skewers' },
  { id: 'nuggets', name: 'Frozen chicken nuggets', zh: '清真鸡块', e: '🍗', cat: 'Protein', price: 25, unit: '1 kg' },

  // Dairy
  { id: 'milk', name: 'Milk (full fat)', zh: '全脂牛奶', e: '🥛', cat: 'Dairy', price: 12, unit: '1 L' },
  { id: 'yogurt', name: 'Thick / Greek yogurt', zh: '希腊酸奶 / 浓缩酸奶', e: '🥣', cat: 'Dairy', price: 10, unit: '400 g' },
  { id: 'cheese', name: 'Cheese slices / mozzarella', zh: '芝士片 / 马苏里拉', e: '🧀', cat: 'Dairy', price: 20, unit: 'pack' },
  { id: 'butter', name: 'Butter', zh: '黄油', e: '🧈', cat: 'Dairy', price: 18, unit: '200 g' },
  { id: 'protein_milk', name: 'High-protein milk drink', zh: '高蛋白牛奶', e: '🥤', cat: 'Dairy', price: 6, unit: 'bottle' },

  // Breads & staples
  { id: 'shouzhuabing', name: 'Frozen paratha (手抓饼)', zh: '手抓饼 (冷冻)', e: '🫓', cat: 'Bread & staples', price: 20, unit: '10 pcs' },
  { id: 'tortilla', name: 'Tortilla wraps', zh: '墨西哥卷饼皮', e: '🌯', cat: 'Bread & staples', price: 15, unit: '8 pcs' },
  { id: 'naan', name: 'Uyghur naan (馕)', zh: '新疆馕', e: '🥯', cat: 'Bread & staples', price: 5, unit: 'piece' },
  { id: 'bread', name: 'Sandwich bread', zh: '吐司面包', e: '🍞', cat: 'Bread & staples', price: 10, unit: 'loaf' },
  { id: 'instant_rice', name: 'Self-heating / instant rice', zh: '自热米饭 / 即食米饭', e: '🍚', cat: 'Bread & staples', price: 6, unit: 'bowl' },
  { id: 'oats', name: 'Instant oats', zh: '即食燕麦片', e: '🌾', cat: 'Bread & staples', price: 15, unit: '1 kg' },
  { id: 'potato', name: 'Potatoes', zh: '土豆', e: '🥔', cat: 'Bread & staples', price: 4, unit: '1 kg' },
  { id: 'sweet_potato', name: 'Sweet potatoes', zh: '红薯', e: '🍠', cat: 'Bread & staples', price: 6, unit: '1 kg' },
  { id: 'frozen_fries', name: 'Frozen fries', zh: '冷冻薯条', e: '🍟', cat: 'Bread & staples', price: 15, unit: '1 kg' },
  { id: 'frozen_samosa', name: 'Frozen samosa / spring rolls', zh: '冷冻春卷 / 清真烤包子', e: '🥟', cat: 'Bread & staples', price: 18, unit: 'pack' },
  { id: 'granola', name: 'Granola / muesli', zh: '烘焙燕麦片 / 格兰诺拉', e: '🥣', cat: 'Bread & staples', price: 25, unit: '500 g' },

  // Fruit & veg
  { id: 'banana', name: 'Bananas', zh: '香蕉', e: '🍌', cat: 'Fruit & veg', price: 6, unit: '1 kg' },
  { id: 'apple', name: 'Apples', zh: '苹果', e: '🍎', cat: 'Fruit & veg', price: 8, unit: '1 kg' },
  { id: 'dates', name: 'Dates', zh: '椰枣 / 红枣', e: '🌴', cat: 'Fruit & veg', price: 20, unit: '500 g' },
  { id: 'tomato', name: 'Tomatoes', zh: '西红柿', e: '🍅', cat: 'Fruit & veg', price: 6, unit: '1 kg' },
  { id: 'cucumber', name: 'Cucumber', zh: '黄瓜', e: '🥒', cat: 'Fruit & veg', price: 4, unit: '2 pcs' },
  { id: 'onion', name: 'Onion', zh: '洋葱', e: '🧅', cat: 'Fruit & veg', price: 3, unit: '1 kg' },
  { id: 'pepper', name: 'Bell pepper', zh: '彩椒', e: '🫑', cat: 'Fruit & veg', price: 6, unit: '2 pcs' },
  { id: 'frozen_veg', name: 'Frozen mixed veg', zh: '冷冻什锦蔬菜', e: '🥦', cat: 'Fruit & veg', price: 10, unit: '500 g' },
  { id: 'broccoli', name: 'Broccoli', zh: '西兰花', e: '🥦', cat: 'Fruit & veg', price: 6, unit: 'head' },
  { id: 'lettuce', name: 'Lettuce', zh: '生菜', e: '🥬', cat: 'Fruit & veg', price: 4, unit: 'head' },
  { id: 'avocado', name: 'Avocado', zh: '牛油果', e: '🥑', cat: 'Fruit & veg', price: 6, unit: 'piece' },
  { id: 'lemon', name: 'Lemon', zh: '柠檬', e: '🍋', cat: 'Fruit & veg', price: 3, unit: 'piece' },
  { id: 'corn', name: 'Sweet corn', zh: '玉米 / 玉米粒', e: '🌽', cat: 'Fruit & veg', price: 5, unit: 'can/cob' },
  { id: 'mango', name: 'Mango (fresh or frozen)', zh: '芒果 / 冷冻芒果块', e: '🥭', cat: 'Fruit & veg', price: 15, unit: '500 g' },
  { id: 'mushroom', name: 'Mushrooms', zh: '蘑菇', e: '🍄', cat: 'Fruit & veg', price: 6, unit: '250 g' },

  // Pantry & flavour
  { id: 'peanut_butter', name: 'Peanut butter', zh: '花生酱', e: '🥜', cat: 'Pantry', price: 18, unit: 'jar' },
  { id: 'nuts', name: 'Mixed nuts', zh: '每日坚果', e: '🌰', cat: 'Pantry', price: 40, unit: '30 packs' },
  { id: 'honey', name: 'Honey', zh: '蜂蜜', e: '🍯', cat: 'Pantry', price: 25, unit: 'jar' },
  { id: 'oil_spray', name: 'Oil spray / cooking oil', zh: '喷雾油 / 食用油', e: '🫒', cat: 'Pantry', price: 20, unit: 'bottle' },
  { id: 'curry_paste', name: 'Curry powder / paste', zh: '咖喱粉 / 咖喱块', e: '🍛', cat: 'Pantry', price: 15, unit: 'pack' },
  { id: 'tikka_masala', name: 'Tikka / tandoori masala', zh: '印度香料 (淘宝: tikka masala)', e: '🌶️', cat: 'Pantry', price: 20, unit: 'pack' },
  { id: 'cumin_chili', name: 'Cumin + chili flakes', zh: '孜然粉 + 辣椒面', e: '🌶️', cat: 'Pantry', price: 8, unit: 'pack' },
  { id: 'garlic_ginger', name: 'Garlic-ginger paste', zh: '姜蒜泥', e: '🧄', cat: 'Pantry', price: 8, unit: 'jar' },
  { id: 'ketchup', name: 'Ketchup / chili sauce', zh: '番茄酱 / 是拉差', e: '🥫', cat: 'Pantry', price: 10, unit: 'bottle' },
  { id: 'mayo', name: 'Mayonnaise', zh: '沙拉酱 / 蛋黄酱', e: '🥫', cat: 'Pantry', price: 12, unit: 'bottle' },
  { id: 'soy_sauce', name: 'Soy sauce', zh: '生抽', e: '🥢', cat: 'Pantry', price: 8, unit: 'bottle' },
  { id: 'coconut_milk', name: 'Coconut milk', zh: '椰浆', e: '🥥', cat: 'Pantry', price: 10, unit: 'can' },
  { id: 'tomato_paste', name: 'Tomato paste / passata', zh: '番茄膏 / 番茄酱罐头', e: '🥫', cat: 'Pantry', price: 10, unit: 'can' },
  { id: 'chocolate', name: 'Dark chocolate', zh: '黑巧克力', e: '🍫', cat: 'Pantry', price: 15, unit: 'bar' },
  { id: 'protein_powder', name: 'Protein powder', zh: '乳清蛋白粉', e: '💪', cat: 'Pantry', price: 200, unit: '2 lb' },
];

export const ING = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]));
export const ING_CATS = [...new Set(INGREDIENTS.map((i) => i.cat))];

// Quick-add starter pantry for onboarding.
export const STARTER_PANTRY = ['eggs', 'milk', 'yogurt', 'banana', 'shouzhuabing', 'tortilla', 'cooked_chicken', 'cheese', 'oats', 'peanut_butter', 'oil_spray', 'cumin_chili', 'ketchup'];
