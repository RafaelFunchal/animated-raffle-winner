
=== Animated Raffle Winner ===

Contributors:      RafaelFunchal
Tags:              block, raffle, random, lottery, animation
Tested up to:      7.1.4
Stable tag:        1.1
License:           GPLv2 or later
License URI:       https://www.gnu.org/licenses/gpl-2.0.html

An interactive block to create animated raffles with random numbers, theater seats, or CSV participant lists and celebratory animations.

== Description ==

The Animated Raffle Winner block allows you to create engaging raffle experiences on your WordPress site. With smooth animations and exciting visual effects, this block is perfect for promotions, events, contests, and any situation that requires random number, seat, or participant selection.

**Key Features:**

* Three raffle modes in a tabbed sidebar: **Numbers** (custom numeric range), **Theater** (row/section letter + number, e.g. `A1` to `C10`), and **CSV** (upload or paste a participant list)
* CSV column selector (pick one or multiple columns to display, with optional header row skipping and hyphen/space separator toggle)
* Option to **exclude previous winners** (no repeats) with a live history of drawn winners and a reset button
* Custom title heading and option to hide the default range/participant subtitle
* Cryptographically unbiased random selection (`window.crypto.getRandomValues`)
* Decelerating "slot machine" rolling animation (1 to 15 seconds) before revealing the winner
* 10 Celebration animation options (Fireworks, Confetti, Party Cannons, Gold Coins, Stars, Sparkles, 3D Balloons, Floating Hearts, Spiral Streamers, or None) with configurable celebration duration (1 to 30 seconds)
* Fullscreen mode with keyboard (`Escape`) and on-screen close (`×`) button with tooltip
* Theme font inheritance and per-block Typography Font Family selector
* Simple, accessible, and fully responsive interface

**How to Use:**

1. Add the "Animated Raffle Winner" block to your content
2. Configure the starting number in the settings panel
3. Configure the ending number in the settings panel
4. Publish or preview the page
5. Click the "Draw" button to start the raffle!

The block is perfect for:
- Raffles at events and promotions
- Random selection of participants
- Games and interactive activities
- Educational demonstrations about randomness
- Any application that needs random selection with visual impact

== Installation ==

1. Upload the plugin files to the `/wp-content/plugins/animated-raffle-winner` directory or install directly through the WordPress plugins screen
2. Activate the plugin through the 'Plugins' screen in WordPress
3. Add the "Animated Raffle Winner" block to any page or post using the Gutenberg editor

== Frequently Asked Questions ==

= How do I configure the number range? =

In the block editor, select the Animated Raffle Winner block. In the right sidebar (Inspector), you will see two fields: "Starting Number" and "Ending Number". Enter the desired values.

= Can I use negative numbers? =

Yes! The block accepts any integer, including negative numbers.

= Does the animation work on mobile devices? =

Yes, the block is fully responsive and works perfectly on smartphones and tablets.

= Can I customize the animation duration? =

Yes! You can set the raffle animation duration between 1 and 15 seconds in the Raffle Settings panel.

= Can I draw theater seats (letters and numbers) or participant names from a CSV? =

Yes! In the Raffle Settings sidebar panel, switch between the **Numbers**, **Theater** (e.g. `A1` to `C10`), and **CSV** tabs. In CSV mode, you can upload a `.csv` file or paste rows, skip the header row, and choose which column(s) to display on the frontend.

= Is the raffle truly random? =

Yes, the block uses the browser's Web Crypto API (`window.crypto.getRandomValues()`) with rejection sampling for unbiased random selection (with automatic fallback to `Math.random()`).

== Screenshots ==

1. Block in the editor showing the range settings
2. Initial state of the block on the frontend before the raffle
3. Animation in progress with numbers rolling
4. Raffle result with large number and fireworks

== Changelog ==

= 1.1 =
* Added tabbed Raffle Settings with three modes: Numbers, Theater (Letter + Number, e.g., A1 to C10), and CSV participant lists
* Added CSV column selector to choose which column(s) to display on the frontend, with a toggle for hyphen or space separation
* Added "Exclude previous winners (no repeats)" option with drawn winner history and reset button
* Added optional Custom Title and toggle to hide the default range/participant subtitle
* Added 6 new celebration animation types (Party Cannons, Gold Coins, Sparkles, Floating Hearts, Spiral Streamers, and None), upgraded 3D Balloons animation, and added a Celebration Duration setting
* Added graceful particle exit when the celebration timer ends
* Added theme font-family inheritance across all elements and per-block Typography Font Family support
* Upgraded random winner selection to use `window.crypto.getRandomValues()` with unbiased rejection sampling
* Added decelerating slot-machine roll effect before revealing the winner
* Added an on-screen close (`×`) button in fullscreen mode for mobile and touch devices
* Added `load_plugin_textdomain` and `wp_set_script_translations` support
* Tested up to WordPress 7.1.4

= 1.0 =
* Added background image selector from Media Library
* Added background/overlay color opacity control (0-100)
* Added text size presets (Extra Small, Small, Medium, Large, Extra Large)
* Updated front-end button label to "Draw again" after each result
* Added accessibility improvements: live result announcements and reduced-motion support
* Added fullscreen exit via Escape key and automatic celebration stop

= 0.1.0 =
* Initial release
* Raffle with configurable range
* 5-second animation
* Celebratory fireworks
* Responsive interface

== Upgrade Notice ==

= 1.1 =
Adds Theater (Letter + Number) and CSV participant raffle modes, multi-column CSV selection, no-repeat draws, custom titles, and decelerating roll animations!

= 1.0 =
Major update with background color and gradient customization support. Upgrade to customize your raffle block backgrounds!

= 0.1.0 =
First version of Animated Raffle Winner. Install to start creating interactive raffles!

== Source Code & Build Instructions ==

The development source code and build tools for this plugin are publicly maintained on GitHub:
https://github.com/RafaelFunchal/animated-raffle-winner

The source code is also included directly within the `src/` directory in this distribution package.

To build the plugin from source:
1. Ensure you have Node.js and npm installed.
2. Install the dependencies: `npm install`
3. Build the assets: `npm run build`
