# PalPaw Custom Icon

The current implementation of the PalPaw icon uses React Native components to render a cute cat face directly in the AuthPrompt component. For a more permanent solution, you should:

1. Create an actual icon image file from the provided design
2. Add it to your assets directory
3. Update the AuthPrompt component to use the image file instead of the component-based approach

## Icon Design Specification

The icon is a cute cat face with:
- Round amber-colored face
- Triangular ears with pink inner parts
- Purple eyes with vertical pupils
- Small pink nose
- Simple smile
- Whiskers

## Implementation Steps

1. Have a designer create a proper PNG or SVG version of this icon
2. Save it as `cat-icon.png` in various sizes in your `assets/images` directory
3. Update `constants/images.ts` to include this new icon
4. Update the AuthPrompt component to use the image instead of the component-based icon

## Example Code for Using the Image

```jsx
// In constants/images.ts
import catIcon from "@/assets/images/cat-icon.png";

export default {
  // ...existing images
  catIcon,
};

// In AuthPrompt.tsx
import images from "@/constants/images";

// Then replace the icon implementation with:
<Image 
  source={images.catIcon} 
  className="w-32 h-32"
  resizeMode="contain"
/>
```

This will make your app more performant and the icon will look more professional. 