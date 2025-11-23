from PIL import Image

def extract_cat_assets(input_path):
    try:
        img = Image.open(input_path).convert("RGBA")
        width, height = img.size
        
        # Coordinates estimated from the provided image structure
        # Top Cat Head (Upside down in original, but we need it as a sprite)
        # It's roughly the top 1/3 of the image, centered
        # Let's crop the top cat face
        top_cat_box = (180, 80, 520, 350) # Approximate box for top cat head
        top_cat = img.crop(top_cat_box)
        top_cat.save("assets/cat_head_top.png")
        
        # Bottom Cat Head (Right side up)
        # Roughly bottom 1/3
        bottom_cat_box = (180, 600, 520, 880) # Approximate box for bottom cat head
        bottom_cat = img.crop(bottom_cat_box)
        bottom_cat.save("assets/cat_head_bottom.png")
        
        # Fur Texture (Body)
        # We can take a slice from the very top or very bottom where the body extends
        # Taking a slice from the top body extension
        fur_box = (250, 0, 450, 80) 
        fur = img.crop(fur_box)
        fur.save("assets/cat_body.png")
        
        print("Cat assets extracted successfully!")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    extract_cat_assets('/Users/desousa/beex/flappy-bird-clone/assets/cat_ref.jpg')
