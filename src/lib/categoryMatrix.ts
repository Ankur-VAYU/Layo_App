export interface MasterCategoryItem {
  id: string;
  label: string;
  subtext: string;
  weightGrams: number;
  isPromo?: boolean;
  isOversized?: boolean;
  isFood?: boolean;
}

export interface MasterCategoryGroup {
  id: string;
  name: string;
  icon: string;
  requiresAge?: boolean;
  isFoodGlobal?: boolean;
  items: MasterCategoryItem[];
}

export const DEFAULT_MASTER_CATEGORIES: MasterCategoryGroup[] = [
  {
    id: 'clothing',
    name: 'Clothing',
    icon: 'checkroom',
    requiresAge: true,
    items: [
      { id: 'light_top', label: 'Light Topwear', weightGrams: 200, subtext: 'T-shirts, Shirts, Kurtis, or similar lightweight tops.' },
      { id: 'heavy_top', label: 'Heavy Topwear & Outerwear', weightGrams: 900, subtext: 'Jackets, Sweaters, Coats, or any thick winter tops.' },
      { id: 'light_bot', label: 'Light Bottoms', weightGrams: 250, subtext: 'Shorts, Leggings, Light Pajamas, or thin pants.' },
      { id: 'heavy_bot', label: 'Heavy Bottoms', weightGrams: 500, subtext: 'Jeans, Trousers, Joggers, or heavy material pants.' },
      { id: 'light_dress', label: 'Light Dresses & Sets', weightGrams: 400, subtext: 'Casual Dresses, Light Cotton Suits, Daily-Wear Sarees, Rompers or 2-piece co-ords.' },
      { id: 'heavy_eth', label: 'Heavy Ethnic & Party', weightGrams: 1000, subtext: 'Heavy Lehengas, Bridal Sarees, Embroidered Suits, Gowns, or similar heavy event wear.' },
      { id: 'heavy_win', label: 'Heavy Winter Sets', weightGrams: 1300, subtext: 'Tracksuits, Snowsuits, or heavy 2-piece winter combos.' },
      { id: 'cloth_acc', label: 'Small Cloth Accessories', weightGrams: 50, isPromo: true, subtext: 'Socks, Innerwear, Lingerie Sets, Ties, Handkerchiefs, and Face Towels ONLY.' },
    ]
  },
  {
    id: 'footwear',
    name: 'Footwear',
    icon: 'steps',
    requiresAge: true,
    items: [
      { id: 'light_shoe', label: 'Light Footwear', weightGrams: 400, subtext: "Flip-Flops, Flats, Sandals, Ballet Flats, or kids' shoes." },
      { id: 'heavy_shoe', label: 'Heavy Footwear', weightGrams: 1000, subtext: 'Sneakers, Running Shoes, Formal Leather Shoes, Boots, or Block Heels.' },
    ]
  },
  {
    id: 'bags',
    name: 'Bags & Luggage',
    icon: 'work',
    items: [
      { id: 'small_bag', label: 'Small Bags & Wallets', weightGrams: 300, subtext: 'Wallets, Purses, Clutches, Sling Bags, or Fanny Packs.' },
      { id: 'medium_bag', label: 'Medium/Heavy Bags', weightGrams: 800, subtext: 'Backpacks, Laptop Bags, Handbags, Tote Bags, or Duffle Bags.' },
      { id: 'luggage', label: 'Luggage / Trolleys', weightGrams: 3000, isOversized: true, subtext: 'Cabin Luggage, Suitcases, or Check-in Bags.' },
    ]
  },
  {
    id: 'jewelry',
    name: 'Jewelry & Accessories',
    icon: 'diamond',
    items: [
      { id: 'light_jewel', label: 'Light Jewelry', weightGrams: 50, isPromo: true, subtext: 'Earrings, Rings, Chains, Bracelets, Hair Clips, or similar light items.' },
      { id: 'struct_acc', label: 'Structured Accessories', weightGrams: 200, subtext: 'Watches, Sunglasses, Leather Belts, or heavy Bridal Jewelry sets.' },
    ]
  },
  {
    id: 'beauty',
    name: 'Beauty & Personal Care',
    icon: 'face_3',
    items: [
      { id: 'light_cos', label: 'Light Cosmetics', weightGrams: 80, subtext: 'Lipsticks, Kajal, Makeup Brushes, Compacts, or small serums.' },
      { id: 'heavy_bath', label: 'Heavy Bath & Body', weightGrams: 400, subtext: 'Shampoo Bottles, Perfumes, Body Lotions, or Skincare Kits.' },
    ]
  },
  {
    id: 'home',
    name: 'Home, Kitchen & Living',
    icon: 'home',
    items: [
      { id: 'light_kit', label: 'Light Kitchen Utensils', weightGrams: 400, subtext: 'Cutlery, Spatulas, Small Steel Bowls, Rolling Pins (Belan), or Plastic Containers.' },
      { id: 'soft_tex', label: 'Soft Home Textiles', weightGrams: 1000, subtext: 'Bedsheets, Blankets, Towel Sets, Curtains, or Cushion Covers.' },
      { id: 'std_cook', label: 'Standard Cookware & Decor', weightGrams: 1500, subtext: 'Dinner Plates, Frying Pans, Tawas, Wall Clocks, Small Rugs, or Table Lamps.' },
      { id: 'heavy_kit', label: 'Heavy Kitchenware & Appliances', weightGrams: 3000, subtext: 'Pressure Cookers, Mixer Grinders, Heavy Kadhais, or Cast Iron Pans.' },
      { id: 'oversized_home', label: 'Oversized Home Goods', weightGrams: 5000, isOversized: true, subtext: 'Rugs, Large Carpets, Floor Lamps, Large Mirrors, or Small Furniture.' },
    ]
  },
  {
    id: 'toys',
    name: 'Toys, Games & Kids Gear',
    icon: 'smart_toy',
    items: [
      { id: 'small_toy', label: 'Small Toys & Activity Kits', weightGrams: 300, subtext: 'Action Figures, Card Games, Small Plushies, Rattles, or Craft & Stationery Kits.' },
      { id: 'std_toy', label: 'Standard Boxed Toys', weightGrams: 1200, subtext: 'Board Games, Building Blocks (LEGO), Remote Control Cars, Doll Sets, or Medium Soft Toys.' },
      { id: 'heavy_toy', label: 'Heavy / Wooden Toys', weightGrams: 2500, subtext: 'Wooden Train Sets, DIY Science Kits, Large Puzzles, or Electronic Learning Toys.' },
      { id: 'oversized_toy', label: 'Oversized Toys & Play Gear', weightGrams: 5000, isOversized: true, subtext: 'Play Tents, Large Dollhouses, Baby Walkers, Ride-on Toys, or Large Play Mats.' },
    ]
  },
  {
    id: 'books',
    name: 'Books, Documents & Media',
    icon: 'menu_book',
    items: [
      { id: 'docs', label: 'Important Documents & Papers', weightGrams: 200, subtext: 'Visas, Legal Papers, Transcripts, Certificates, Planners, or Greeting Cards.' },
      { id: 'light_book', label: 'Light Books & Magazines', weightGrams: 400, subtext: 'Paperbacks, Comic Books, Children’s Storybooks, or Thin Magazines.' },
      { id: 'std_book', label: 'Standard Hardcovers & Medium Books', weightGrams: 1000, subtext: 'Hardcover Novels, Cookbooks, Biographies, or Medium Graphic Novels.' },
      { id: 'heavy_book', label: 'Heavy Books & Textbooks', weightGrams: 2500, subtext: 'University Textbooks, Coffee Table Books, Heavy Encyclopedias, or Book Box-Sets.' },
    ]
  },
  {
    id: 'food',
    name: 'Food, Snacks & Groceries',
    icon: 'restaurant',
    isFoodGlobal: true,
    items: [
      { id: 'light_snack', label: 'Light Snacks & Spices', weightGrams: 500, isFood: true, subtext: 'Namkeen, Dry Snacks, Spices (Masalas), Tea Leaves, or Coffee Powder.' },
      { id: 'heavy_groc', label: 'Heavy Sweets & Groceries', weightGrams: 1500, isFood: true, subtext: 'Mithai / Sweets Boxes, Pickles (Glass Jars), Lentils (Dals), or Baking Ingredients.' },
    ]
  }
];

export function loadMasterCategories(): MasterCategoryGroup[] {
  if (typeof window === 'undefined') return DEFAULT_MASTER_CATEGORIES;
  try {
    const raw = localStorage.getItem('layo_master_categories');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load master categories', e);
  }
  return DEFAULT_MASTER_CATEGORIES;
}

export function saveMasterCategories(cats: MasterCategoryGroup[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('layo_master_categories', JSON.stringify(cats));
  } catch (e) {
    console.error('Failed to save master categories', e);
  }
}
