import os
import re
import urllib.request
from PIL import Image, ImageDraw, ImageFont

# Define taxonomy verbatim
TAXONOMY = {
    "🌱 Raw Turmeric": ["Fresh Turmeric", "Turmeric Rhizomes", "Turmeric Fingers", "Turmeric Bulbs", "Seed Rhizomes"],
    "🟡 Processed Turmeric": ["Turmeric Powder", "Organic Turmeric Powder", "Turmeric Flakes", "Turmeric Granules", "Turmeric Slices", "Turmeric Paste"],
    "🧪 Extracts & Oils": ["Curcumin Extract", "Curcumin Powder", "Turmeric Essential Oil", "Turmeric Oleoresin", "Turmeric Resin"],
    "🌿 Organic & Premium Varieties": ["Lakadong Turmeric", "Salem Turmeric", "Erode Turmeric", "Rajapuri Turmeric", "Alleppey Turmeric", "Black Turmeric", "White Turmeric", "Wild Turmeric"],
    "🍵 Food & Health Products": ["Turmeric Tea", "Turmeric Latte Mix", "Turmeric Milk Mix", "Turmeric Juice", "Turmeric Pickle", "Turmeric Candy", "Health Drink Mix", "Turmeric Capsules", "Turmeric Tablets"],
    "💄 Herbal & Cosmetic Products": ["Turmeric Soap", "Turmeric Face Pack", "Turmeric Cream", "Turmeric Face Wash", "Turmeric Scrub", "Turmeric Essential Oil Blend"]
}

# Output directory in Next.js public assets folder
out_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "public", "product-catalog"))
os.makedirs(out_dir, exist_ok=True)

# Mapping Category to photo IDs
CATEGORY_PHOTOS = {
    "Raw Turmeric": "photo-1615485290382-441e4d049cb5",
    "Processed Turmeric": "photo-1615485500704-8f990f2400f9",
    "Extracts & Oils": "photo-1608571423902-eed4a5ad8108",
    "Organic & Premium Varieties": "photo-1596040033229-a9821ebd058d",
    "Food & Health Products": "photo-1576092768241-dec231879fc3",
    "Herbal & Cosmetic Products": "photo-1607006342411-92fc763b4e68"
}

# Mapping Product Types to photo IDs
PRODUCT_PHOTOS = {
    # Raw
    "Fresh Turmeric": "photo-1615485290382-441e4d049cb5",
    "Turmeric Rhizomes": "photo-1615485290382-441e4d049cb5",
    "Turmeric Fingers": "photo-1615485290382-441e4d049cb5",
    "Turmeric Bulbs": "photo-1615485290382-441e4d049cb5",
    "Seed Rhizomes": "photo-1615485290382-441e4d049cb5",
    # Processed
    "Turmeric Powder": "photo-1615485500704-8f990f2400f9",
    "Organic Turmeric Powder": "photo-1615485500704-8f990f2400f9",
    "Turmeric Flakes": "photo-1599940824399-b87987ceb72a",
    "Turmeric Granules": "photo-1599940824399-b87987ceb72a",
    "Turmeric Slices": "photo-1509358271058-acd22cc93898",
    "Turmeric Paste": "photo-1615485500704-8f990f2400f9",
    # Extracts
    "Curcumin Extract": "photo-1584017911766-d451b3d0e843",
    "Curcumin Powder": "photo-1584017911766-d451b3d0e843",
    "Turmeric Essential Oil": "photo-1608571423902-eed4a5ad8108",
    "Turmeric Oleoresin": "photo-1608571423902-eed4a5ad8108",
    "Turmeric Resin": "photo-1608571423902-eed4a5ad8108",
    # Premium
    "Lakadong Turmeric": "photo-1596040033229-a9821ebd058d",
    "Salem Turmeric": "photo-1596040033229-a9821ebd058d",
    "Erode Turmeric": "photo-1596040033229-a9821ebd058d",
    "Rajapuri Turmeric": "photo-1596040033229-a9821ebd058d",
    "Alleppey Turmeric": "photo-1596040033229-a9821ebd058d",
    "Black Turmeric": "photo-1596040033229-a9821ebd058d",
    "White Turmeric": "photo-1596040033229-a9821ebd058d",
    "Wild Turmeric": "photo-1596040033229-a9821ebd058d",
    # Food/Health
    "Turmeric Tea": "photo-1576092768241-dec231879fc3",
    "Turmeric Latte Mix": "photo-1576092768241-dec231879fc3",
    "Turmeric Milk Mix": "photo-1576092768241-dec231879fc3",
    "Turmeric Juice": "photo-1621506289937-a8e4df240d0b",
    "Turmeric Pickle": "photo-1589135304675-8f0dc8cd4852",
    "Turmeric Candy": "photo-1581798459218-a6d1a938c5bd",
    "Health Drink Mix": "photo-1556881286-fc6915169721",
    "Turmeric Capsules": "photo-1584017911766-d451b3d0e843",
    "Turmeric Tablets": "photo-1584017911766-d451b3d0e843",
    # Cosmetics
    "Turmeric Soap": "photo-1607006342411-92fc763b4e68",
    "Turmeric Face Pack": "photo-1556228720-195a672e8a03",
    "Turmeric Cream": "photo-1556228720-195a672e8a03",
    "Turmeric Face Wash": "photo-1556228720-195a672e8a03",
    "Turmeric Scrub": "photo-1556228720-195a672e8a03",
    "Turmeric Essential Oil Blend": "photo-1608571423902-eed4a5ad8108",
}

# HSL Colors matching dashboard styles (fallback if offline)
BG_COLORS = {
    "Raw Turmeric": (45, 120, 95),       # Dark Forest Green
    "Processed Turmeric": (205, 150, 25), # Rich Gold
    "Extracts & Oils": (25, 100, 160),     # Vibrant Royal Blue
    "Organic & Premium Varieties": (115, 60, 160), # Deep Purple
    "Food & Health Products": (210, 85, 40), # Spice Amber Orange
    "Herbal & Cosmetic Products": (195, 55, 105) # Elegant Rose/Magenta
}

def generate_fallback_image(path, name, category_name):
    # HSL-like base color lookup
    bg_color = BG_COLORS.get(category_name, (80, 80, 80))
    img = Image.new("RGBA", (256, 256), color=bg_color)
    draw = ImageDraw.Draw(img)
    
    # Draw simple visual decorations (circles/overlays)
    draw.ellipse([20, 20, 160, 160], fill=(255, 255, 255, 18))
    draw.ellipse([110, 110, 230, 230], fill=(255, 255, 255, 12))
    draw.rectangle([8, 8, 248, 248], outline=(255, 255, 255, 60), width=2)
    
    # Initials
    words = [w for w in name.split() if w]
    initials = "".join(w[0] for w in words[:3]).upper()
    
    draw.text((128, 105), initials, fill=(255, 255, 255, 255), anchor="mm")
    display_name = name[:25] + "..." if len(name) > 25 else name
    draw.text((128, 195), display_name, fill=(255, 255, 255, 230), anchor="mm")
    
    img.save(path)
    print(f"   -> Fallback generated: {os.path.basename(path)}")

def download_unsplash_image(path, photo_id, default_name, default_category):
    url = f"https://images.unsplash.com/{photo_id}?auto=format&fit=crop&w=256&h=256&q=80"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    req = urllib.request.Request(url, headers=headers)
    
    try:
        print(f"Downloading Unsplash {photo_id} for '{default_name}'...")
        with urllib.request.urlopen(req, timeout=8) as response:
            with open(path, "wb") as f:
                f.write(response.read())
        print(f"   -> Succeeded!")
    except Exception as e:
        print(f"   -> Failed downloading ({e}). Generating fallback card instead...")
        generate_fallback_image(path, default_name, default_category)

# 1. Generate category images
print("Generating Category Images...")
for cat_name, photo_id in CATEGORY_PHOTOS.items():
    slug = re.sub(r'[^a-z0-9]+', '_', cat_name.lower()).strip('_')
    img_path = os.path.join(out_dir, f"category_{slug}.png")
    download_unsplash_image(img_path, photo_id, cat_name, cat_name)

# 2. Generate product images
print("\nGenerating Product Images...")
for cat_full_name, products in TAXONOMY.items():
    cat_clean_name = cat_full_name[1:].strip()
    for prod in products:
        slug = re.sub(r'[^a-z0-9]+', '_', prod.lower()).strip('_')
        img_path = os.path.join(out_dir, f"{slug}.png")
        photo_id = PRODUCT_PHOTOS.get(prod, CATEGORY_PHOTOS.get(cat_clean_name, "photo-1615485290382-441e4d049cb5"))
        download_unsplash_image(img_path, photo_id, prod, cat_clean_name)

print("\nAll product catalog images generated successfully!")
