#!/usr/bin/env python3
"""
Generate simple icons for the OnlyOneTab extension.
Creates PNG icons in sizes: 16x16, 48x48, and 128x128
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size):
    """Create a simple icon with the number '1' representing one tab"""
    # Create a new image with a blue background
    img = Image.new('RGBA', (size, size), (52, 152, 219, 255))  # #3498db
    draw = ImageDraw.Draw(img)

    # Add a white rounded rectangle
    margin = size // 8
    rect_coords = [margin, margin, size - margin, size - margin]
    draw.rounded_rectangle(rect_coords, radius=size//10, fill=(255, 255, 255, 255))

    # Add the number "1" in the center
    text = "1"
    # Try to use a system font, fallback to default if not available
    try:
        font_size = size // 2
        # Use default font (will be available on all systems)
        font = ImageFont.load_default()
        # For larger sizes, we can't use custom fonts without additional dependencies
        # so we'll draw a simple "1" shape instead
        if size > 16:
            # Draw a custom "1" shape
            one_width = size // 6
            one_height = size // 2
            one_x = (size - one_width) // 2
            one_y = (size - one_height) // 2

            # Draw the "1" as a rectangle (main body)
            draw.rectangle(
                [one_x, one_y, one_x + one_width, one_y + one_height],
                fill=(52, 152, 219, 255)
            )

            # Draw the top serif of "1"
            serif_width = one_width // 2
            draw.rectangle(
                [one_x - serif_width, one_y, one_x, one_y + one_width // 2],
                fill=(52, 152, 219, 255)
            )
    except:
        pass

    # Add a subtle tab indicator at the top
    tab_width = size // 3
    tab_height = size // 10
    tab_x = (size - tab_width) // 2
    draw.rectangle(
        [tab_x, margin, tab_x + tab_width, margin + tab_height],
        fill=(52, 152, 219, 255)
    )

    return img

def main():
    """Generate icons in different sizes"""
    sizes = {
        'icon16.png': 16,
        'icon48.png': 48,
        'icon128.png': 128
    }

    for filename, size in sizes.items():
        icon = create_icon(size)
        icon.save(filename, 'PNG')
        print(f"Created {filename} ({size}x{size})")

if __name__ == "__main__":
    main()