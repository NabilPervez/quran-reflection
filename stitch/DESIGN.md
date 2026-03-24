# Design System Specification: The Sacred Manuscript

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Digital Manuscript."** 

Unlike standard utility-first applications, this system treats the screen as a piece of high-quality, archival-grade paper. The goal is to facilitate *Tadabbur* (deep reflection) by removing the "noise" of traditional UI. We break the template look through **Intentional Asymmetry**—where text and imagery are offset to create a natural, editorial flow—and **Atmospheric Breathing Room**. This isn't just a reading app; it is a scholarly sanctuary. We prioritize the sacredness of the Arabic script by giving it expansive margins and letting the typography drive the layout, rather than forcing it into rigid boxes.

---

## 2. Colors & Surface Philosophy
The palette is rooted in nature and tradition, utilizing a warm, organic base to prevent the sterile "blue-light" fatigue of standard digital interfaces.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections. Boundaries must be established through tonal shifts. To separate the header from the feed, or a reflection card from the background, use a background color shift (e.g., a `surface-container-low` section sitting on a `surface` background). 

### Surface Hierarchy & Nesting
Treat the UI as physical layers of fine paper. 
*   **Base:** `surface` (#faf9f6) is your desk.
*   **Content Areas:** Use `surface-container-low` (#f4f3f1) to define broad reading areas.
*   **Active Elements:** Use `surface-container-lowest` (#ffffff) for cards or floating reflection inputs to create a "lifted" feel.

### The Glass & Gradient Rule
To provide "visual soul," use subtle gradients for primary actions. Instead of a flat green button, use a linear gradient from `primary` (#00361a) to `primary_container` (#1a4d2e). For floating navigation or context menus, employ **Glassmorphism**: use semi-transparent surface colors with a `backdrop-blur` of 12px-20px to allow the underlying text to peek through, maintaining a sense of place.

---

## 3. Typography: Editorial Authority
We use a high-contrast typography scale to create an authoritative, scholarly hierarchy.

*   **Arabic Text (KFGQPC Uthman Taha Naskh):** The centerpiece. It must always be at least 150% larger than the corresponding English translation. It requires generous line-height (leading) to accommodate calligraphic flourishes.
*   **English UI & Translation (Inter):** 
    *   **Display Scales:** Use `display-lg` (3.5rem) for Surah titles to create a bold, editorial entrance.
    *   **Body Scales:** `body-lg` (1rem) for translations, ensuring high legibility for long-form reading.
*   **The Scholarly Contrast:** Pair a `display-sm` Surah title with a `label-sm` metadata tag (e.g., "Makkah • 7 Verses") to create a sophisticated, tiered information architecture.

---

## 4. Elevation & Depth
In this design system, depth is felt, not seen. We move away from the "floating card" aesthetic of 2010-era design.

### Tonal Layering
Depth is achieved by "stacking" the surface-container tiers. Place a `surface-container-lowest` card on a `surface-container-low` section. This creates a soft, natural lift that mimics the way light hits layered paper.

### Ambient Shadows
If a floating element (like a FAB or a Modal) requires a shadow, it must be an **Ambient Shadow**:
*   **Blur:** 40px - 60px.
*   **Opacity:** 4% - 6%.
*   **Color:** Use a tinted version of the `on_surface` color (a deep charcoal-green) rather than pure black. This ensures the shadow feels like a natural extension of the environment.

### The "Ghost Border" Fallback
If contrast ratios or accessibility require a container edge, use a **Ghost Border**: `outline_variant` (#c1c9bf) at **15% opacity**. It should be barely perceptible—a suggestion of a boundary rather than a hard stop.

---

## 5. Components

### Primary Buttons
*   **Style:** Solid `primary` background with `on_primary` text.
*   **Radius:** `md` (0.375rem) for a disciplined, scholarly look. 
*   **Interaction:** On hover, transition to `primary_container`. No heavy shadows; just a subtle shift in tonal depth.

### Reflection Cards
*   **Layout:** Forbid the use of divider lines. Separate the Ayah from the user's reflection using a `spacing-6` (2rem) vertical gap or a subtle background shift to `surface_container_high`.
*   **Typography:** The Ayah should be centered, while the reflection (English) is left-aligned to create a pleasing, asymmetric visual tension.

### Text Inputs (Tadabbur Entry)
*   **Style:** Minimalist. No enclosing box. Use a `surface_variant` bottom bar (2px) that expands into a `primary` tint when focused.
*   **Label:** Use `label-md` floating above the input, always visible to maintain context during deep thought.

### Chips (Topic Tags)
*   **Style:** `surface-container-highest` background with `on_surface_variant` text.
*   **Shape:** `full` (pill-shaped) to contrast against the more rectangular card structures.

---

## 6. Do's and Don'ts

### Do:
*   **Embrace the Max-Width:** On desktop, center the content with a max-width of 720px (for reading) or 1024px (for dashboards). Reflection requires focus; don't let the text span the whole screen.
*   **Use Asymmetric Margins:** On desktop, allow the Arabic text to bleed slightly into the right margin to emphasize its unique flow.
*   **Prioritize White Space:** Use `spacing-16` (5.5rem) between major sections (e.g., between the Quranic text and the Reflection Feed).

### Don't:
*   **Don't use 1px Dividers:** Lines clutter the mind. Use white space (`spacing-8`) to separate list items.
*   **Don't use Pure Black (#000000):** It is too harsh on the `surface` cream. Use `on_surface` (#1a1c1a) for all primary text to maintain the "ink-on-paper" warmth.
*   **Don't use Aggressive Animations:** Transitions should be slow and ease-in-out (300ms+). Avoid "snappy" or "bouncy" motions that disrupt the meditative state.