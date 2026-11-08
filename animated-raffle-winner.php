<?php
/**
 * Plugin Name:       Animated Raffle Winner
 * Description:       An interactive block to create animated raffles with random numbers, theater seats, or CSV participant lists and celebratory animations.
 * Version:           1.1
 * Requires at least: 6.1
 * Requires PHP:      7.0
 * Author:            RafaelFunchal
 * License:           GPLv2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       animated-raffle-winner
 * Source Code:       https://github.com/RafaelFunchal/animated-raffle-winner
 *
 * @package AnimatedRaffleWinner
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers the block using the metadata loaded from the `block.json` file.
 * Behind the scenes, it registers also all assets so they can be enqueued
 * through the block editor in the corresponding context.
 *
 * @see https://developer.wordpress.org/reference/functions/register_block_type/
 */
function animated_raffle_winner_block_init() {
	load_plugin_textdomain(
		'animated-raffle-winner',
		false,
		dirname( plugin_basename( __FILE__ ) ) . '/languages'
	);

	$style_path = __DIR__ . '/build/style-index.css';
	$block_args = array();
	if ( file_exists( $style_path ) ) {
		$block_args['version'] = (string) filemtime( $style_path );
	}

	$block = register_block_type( __DIR__ . '/build/', $block_args );
	if ( $block && ! empty( $block->editor_script_handles ) ) {
		foreach ( $block->editor_script_handles as $handle ) {
			wp_set_script_translations(
				$handle,
				'animated-raffle-winner',
				plugin_dir_path( __FILE__ ) . 'languages'
			);
		}
	}
}
add_action( 'init', 'animated_raffle_winner_block_init' );

