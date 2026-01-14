/**
 * React hook that is used to mark the block wrapper element.
 * It provides all the necessary props like the class name.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#useblockprops
 */
import { useBlockProps, getGradientValueBySlug } from '@wordpress/block-editor';

/**
 * The save function defines the way in which the different attributes should
 * be combined into the final markup, which is then serialized by the block
 * editor into `post_content`.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#save
 *
 * @return {Element} Element to render.
 */
export default function save( { attributes } ) {
	const { startingNumber, endingNumber, raffleDuration, fullscreen, animationType, backgroundColor, gradient, buttonColor, textColor, buttonTextColor } = attributes;

	// Get background style - resolve gradient slug if needed
	// Sanitize CSS values to prevent injection
	// Supports custom multi-color gradients
	const backgroundStyle = {};
	if ( gradient ) {
		// Try to resolve gradient slug, fallback to direct value (supports custom gradients)
		const gradientValue = getGradientValueBySlug( gradient ) || gradient;
		// Sanitize gradient - block script injection attempts but allow CSS gradient syntax
		// Allows linear-gradient, radial-gradient, conic-gradient with multiple color stops
		if ( gradientValue && ! /<script|javascript:|on\w+\s*=/i.test( gradientValue ) ) {
			backgroundStyle.background = gradientValue;
		}
	} else if ( backgroundColor ) {
		// Sanitize color value - block script injection attempts
		if ( backgroundColor && ! /<script|javascript:|on\w+\s*=/i.test( backgroundColor ) ) {
			backgroundStyle.background = backgroundColor;
		}
	}

	// Get button color style - sanitize CSS values to prevent injection
	const buttonStyle = {};
	if ( buttonColor ) {
		// Sanitize color value - block script injection attempts
		if ( buttonColor && ! /<script|javascript:|on\w+\s*=/i.test( buttonColor ) ) {
			buttonStyle.backgroundColor = buttonColor;
		}
	}
	if ( buttonTextColor ) {
		// Sanitize color value - block script injection attempts
		if ( buttonTextColor && ! /<script|javascript:|on\w+\s*=/i.test( buttonTextColor ) ) {
			buttonStyle.color = buttonTextColor;
		}
	}

	// Get text color style - sanitize CSS values to prevent injection
	const textStyle = {};
	if ( textColor ) {
		// Sanitize color value - block script injection attempts
		if ( textColor && ! /<script|javascript:|on\w+\s*=/i.test( textColor ) ) {
			textStyle.color = textColor;
		}
	}

	// Get accent color style for strong elements and raffle-result (uses button background color)
	const accentStyle = {};
	if ( buttonColor ) {
		// Sanitize color value - block script injection attempts
		if ( buttonColor && ! /<script|javascript:|on\w+\s*=/i.test( buttonColor ) ) {
			accentStyle.color = buttonColor;
		}
	}

	const blockProps = useBlockProps.save( {
		className: 'animated-raffle-winner-block',
	} );

	return (
		<div { ...blockProps }>
			<div
				className="raffle-container"
				style={ backgroundStyle }
				data-starting-number={ startingNumber }
				data-ending-number={ endingNumber }
				data-raffle-duration={ raffleDuration }
				data-fullscreen={ fullscreen }
				data-animation-type={ animationType }
			>
				<p className="raffle-message" style={ textStyle }>
					Raffling between <strong style={ accentStyle }>{ startingNumber }</strong> and{ ' ' }
					<strong style={ accentStyle }>{ endingNumber }</strong>
				</p>
				<button className="raffle-button" style={ buttonStyle }>Draw</button>
				<div className="raffle-result">
					<span className="number-result" style={ accentStyle }></span>
				</div>
				<canvas className="celebration-canvas"></canvas>
			</div>
		</div>
	);
}
