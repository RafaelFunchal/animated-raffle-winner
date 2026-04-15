/**
 * React hook that is used to mark the block wrapper element.
 * It provides all the necessary props like the class name.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#useblockprops
 */
import { useBlockProps, getGradientValueBySlug } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

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
	const {
		startingNumber,
		endingNumber,
		raffleDuration,
		fullscreen,
		animationType,
		textSize,
		backgroundColor,
		overlayOpacity,
		gradient,
		buttonColor,
		textColor,
		buttonTextColor,
		backgroundImageUrl,
	} = attributes;

	const applyColorOpacity = ( colorValue, opacityValue ) => {
		const opacity = Math.max( 0, Math.min( 100, opacityValue ?? 100 ) ) / 100;
		const color = colorValue?.trim();

		if ( ! color ) {
			return colorValue;
		}

		const hexMatch = color.match( /^#([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/ );
		if ( hexMatch ) {
			const hex = hexMatch[ 1 ];
			const normalizedHex =
				hex.length === 3
					? hex.split( '' ).map( ( char ) => char + char ).join( '' )
					: hex;
			const red = parseInt( normalizedHex.slice( 0, 2 ), 16 );
			const green = parseInt( normalizedHex.slice( 2, 4 ), 16 );
			const blue = parseInt( normalizedHex.slice( 4, 6 ), 16 );
			return `rgba(${ red }, ${ green }, ${ blue }, ${ opacity })`;
		}

		const rgbMatch = color.match(
			/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*[0-9.]+\s*)?\)$/i
		);
		if ( rgbMatch ) {
			return `rgba(${ rgbMatch[ 1 ] }, ${ rgbMatch[ 2 ] }, ${ rgbMatch[ 3 ] }, ${ opacity })`;
		}

		return colorValue;
	};

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
			backgroundStyle.background = applyColorOpacity( backgroundColor, overlayOpacity );
		}
	}
	if ( backgroundImageUrl && ! /<script|javascript:/i.test( backgroundImageUrl ) ) {
		if ( gradient && backgroundStyle.background ) {
			backgroundStyle.backgroundImage = `${ backgroundStyle.background }, url("${ backgroundImageUrl }")`;
			delete backgroundStyle.background;
		} else if ( backgroundColor && backgroundStyle.background ) {
			const overlayColor = backgroundStyle.background;
			delete backgroundStyle.background;
			backgroundStyle.backgroundImage = `linear-gradient(${ overlayColor }, ${ overlayColor }), url("${ backgroundImageUrl }")`;
		} else {
			backgroundStyle.backgroundImage = `url("${ backgroundImageUrl }")`;
		}
		backgroundStyle.backgroundSize = 'cover';
		backgroundStyle.backgroundPosition = 'center';
		backgroundStyle.backgroundRepeat = 'no-repeat';
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
				className={ `raffle-container text-size-${ textSize || 'medium' }` }
				style={ backgroundStyle }
				data-starting-number={ startingNumber }
				data-ending-number={ endingNumber }
				data-raffle-duration={ raffleDuration }
				data-fullscreen={ fullscreen }
				data-animation-type={ animationType }
			>
				<p className="raffle-message" style={ textStyle }>
					{ __( 'Raffling between', 'animated-raffle-winner' ) }{ ' ' }
					<strong style={ accentStyle }>{ startingNumber }</strong> { __( 'and', 'animated-raffle-winner' ) }{ ' ' }
					<strong style={ accentStyle }>{ endingNumber }</strong>
				</p>
				<button
					className="raffle-button"
					style={ buttonStyle }
					type="button"
					data-draw-label={ __( 'Draw', 'animated-raffle-winner' ) }
					data-draw-again-label={ __( 'Draw again', 'animated-raffle-winner' ) }
				>
					{ __( 'Draw', 'animated-raffle-winner' ) }
				</button>
				<div className="raffle-result" role="status" aria-live="polite" aria-atomic="true">
					<span className="number-result" style={ accentStyle }></span>
				</div>
				<canvas className="celebration-canvas" aria-hidden="true"></canvas>
			</div>
		</div>
	);
}
