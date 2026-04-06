# **UI/UX Proposal: Quran Reflection App Color Themes**

## **1\. Design Philosophy**

The current color palette feels a bit too heavy and muted, leading to a "depressing" or "muddy" user experience. The goal of this redesign is to ensure the app visually communicates the life, happiness, and holiness inherent in the Quran.

**Core Design Principles for the Update:**

* **Crisp Contrast:** Eliminate muddy grays. Use pure, clean ba ckgrounds to make the text pop.  
* **Vibrant, Deep Hues:** Replace dull greens and browns with jewel tones (emerald, teal, amber) that feel alive and intentional.  
* **Holy & Majestic Aura:** Introduce metallic-inspired colors (like gold and silver) against clean backdrops to evoke a sense of reverence.  
* **Theme Switcher:** Implement a theme selector in the user settings to allow users to personalize their spiritual space.

Below are four proposed themes with CSS variable setups for both Light and Dark modes.

## **Theme 1: Sacred Marble & Gilded Gold (The Core Vision)**

*Vibe: Holy, Majestic, Pure, Elegant. Reminiscent of the Grand Mosque.*

This theme uses alabaster/marble whites with rich, deep gold accents to make the text feel precious and divine.

**Light Mode**

* \--bg-main: \#FDFBF7 (Warm, creamy marble white)  
* \--bg-surface: \#FFFFFF (Pure white for cards/reading areas)  
* \--text-primary: \#2C3E50 (Deep slate—softer on the eyes than pure black)  
* \--text-secondary: \#7F8C8D (Muted gray-blue for dates/subtitles)  
* \--accent-gold: \#D4AF37 (Classic metallic gold)  
* \--accent-gold-light: \#F9E79F (Soft gold for highlights/selections)

**Dark Mode**

* \--bg-main: \#121212 (Deep obsidian/black marble)  
* \--bg-surface: \#1E1E1E (Slightly lighter dark surface)  
* \--text-primary: \#F5F5F5 (Off-white)  
* \--text-secondary: \#A6ACAF (Light slate)  
* \--accent-gold: \#E5C05C (Brightened gold for dark mode contrast)  
* \--accent-gold-light: \#3D311A (Darkened gold for subtle backgrounds)

*Developer Note:* Consider adding a very faint, seamless marble texture to \--bg-main in light mode for added depth.

## **Theme 2: Andalusian Courtyard**

*Vibe: Lively, Refreshing, Historical, Joyful.*

Inspired by Islamic geometry and Andalusian architecture, this theme uses vibrant teal and crisp whites to feel like a breath of fresh air.

**Light Mode**

* \--bg-main: \#F0F8FF (Very soft Alice blue)  
* \--bg-surface: \#FFFFFF  
* \--text-primary: \#0D2B2B (Very deep teal/black)  
* \--text-secondary: \#4A6B6B  
* \--accent-primary: \#008080 (Vibrant Teal)  
* \--accent-secondary: \#FF7F50 (Coral \- adds a spark of life and happiness for buttons/alerts)

**Dark Mode**

* \--bg-main: \#0A192F (Deep night sky blue)  
* \--bg-surface: \#112240 (Rich navy surface)  
* \--text-primary: \#E6F1FF (Crisp icy white)  
* \--text-secondary: \#8892B0  
* \--accent-primary: \#64FFDA (Luminous mint/cyan)  
* \--accent-secondary: \#FF9F7F (Soft luminous coral)

## **Theme 3: Fajr Glow (Golden Hour)**

*Vibe: Awakening, Warm, Uplifting, Spiritual.*

Designed to mimic the sky during Fajr or Maghrib, bringing a sense of warmth, hope, and new beginnings.

**Light Mode**

* \--bg-main: \#FFFCF5 (Morning sunlight cream)  
* \--bg-surface: \#FFFFFF  
* \--text-primary: \#4A2311 (Deep, rich espresso)  
* \--text-secondary: \#8D6E63  
* \--accent-primary: \#E67E22 (Warm sunrise amber)  
* \--accent-secondary: \#F39C12 (Bright joyful orange)

**Dark Mode**

* \--bg-main: \#2C1E16 (Deep, warm roast/slate)  
* \--bg-surface: \#3E2723  
* \--text-primary: \#FFF3E0 (Peach-tinted white)  
* \--text-secondary: \#D7CCC8  
* \--accent-primary: \#F5B041 (Glowing amber)  
* \--accent-secondary: \#E67E22

## **Theme 4: Vibrant Medina (Classic, Reimagined)**

*Vibe: Traditional but Alive, Deeply Rooted, Lush.*

Many apps use green, but they use dull greens. This theme uses lush, vibrant emeralds to represent life, growth, and paradise (Jannah).

**Light Mode**

* \--bg-main: \#F0FDF4 (Extremely light mint)  
* \--bg-surface: \#FFFFFF  
* \--text-primary: \#064E3B (Almost-black forest green)  
* \--text-secondary: \#4B5563  
* \--accent-primary: \#10B981 (Bright, lush Emerald)  
* \--accent-secondary: \#F59E0B (Warm golden yellow for highlights)

**Dark Mode**

* \--bg-main: \#022C22 (Extremely deep forest green)  
* \--bg-surface: \#064E3B  
* \--text-primary: \#ECFDF5 (Mint-tinted white)  
* \--text-secondary: \#A7F3D0  
* \--accent-primary: \#34D399 (Luminous jade)  
* \--accent-secondary: \#FBBF24 (Bright gold)

## **Developer Implementation Strategy**

To implement this easily, utilize CSS custom properties on the :root element and toggle data attributes on the \<body\> or \<html\> tag.

/\* Example CSS Setup \*/  
:root {  
  /\* Default to Sacred Marble Light \*/  
  \--bg-main: \#FDFBF7;  
  \--bg-surface: \#FFFFFF;  
  \--text-primary: \#2C3E50;  
  /\* ... \*/  
}

\[data-theme="sacred-marble-dark"\] {  
  \--bg-main: \#121212;  
  \--bg-surface: \#1E1E1E;  
  \--text-primary: \#F5F5F5;  
  /\* ... \*/  
}

\[data-theme="andalusian-light"\] {  
  \--bg-main: \#F0F8FF;  
  /\* ... \*/  
}

/\* Apply variables to elements \*/  
body {  
  background-color: var(--bg-main);  
  color: var(--text-primary);  
  font-family: 'Inter', sans-serif; /\* Keep UI clean \*/  
}

.quran-text {  
  font-family: 'Amiri', 'Scheherazade New', serif; /\* Traditional, majestic fonts for Arabic \*/  
  color: var(--accent-gold);  
}

.card {  
  background-color: var(--bg-surface);  
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); /\* Very soft shadow to prevent muddiness \*/  
}  
