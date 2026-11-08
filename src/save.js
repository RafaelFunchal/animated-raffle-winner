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
		raffleMode = 'numbers',
		startingNumber,
		endingNumber,
		startingLetter = 'A',
		endingLetter = 'C',
		theaterStartingNumber = 1,
		theaterEndingNumber = 10,
		csvItems = [],
		excludePreviousWinners = false,
		customTitle = '',
		hideSubtitle = false,
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

	const activeMode = [ 'numbers', 'theater', 'csv' ].includes( raffleMode )
		? raffleMode
		: 'numbers';
	const safeStartLetter = /^[A-Z]$/.test( String( startingLetter || '' ).trim().toUpperCase() )
		? String( startingLetter ).trim().toUpperCase()
		: 'A';
	const safeEndLetter = /^[A-Z]$/.test( String( endingLetter || '' ).trim().toUpperCase() )
		? String( endingLetter ).trim().toUpperCase()
		: 'C';
	const safeCsvItems = Array.isArray( csvItems )
		? csvItems
			.slice( 0, 5000 )
			.filter( ( item ) => typeof item === 'string' )
			.map( ( item ) =>
				item
					.replace( /[\u0000-\u001F\u007F-\u009F]/g, '' )
					.replace( /<[^>]*>/g, '' )
					.replace( /[<>]/g, '' )
					.replace( /^[=+@\t\r]+/, '' )
					.trim()
					.slice( 0, 120 )
			)
			.filter( Boolean )
		: [];

	const safeCustomTitle = typeof customTitle === 'string'
		? customTitle
			.replace( /[\u0000-\u001F\u007F-\u009F]/g, '' )
			.replace( /<[^>]*>/g, '' )
			.replace( /[<>]/g, '' )
			.trim()
			.slice( 0, 120 )
		: '';

	const blockProps = useBlockProps.save( {
		className: 'animated-raffle-winner-block',
	} );

	return (
		<div { ...blockProps }>
			<div
				className={ `raffle-container text-size-${ textSize || 'medium' } mode-${ activeMode }` }
				style={ backgroundStyle }
				data-raffle-mode={ activeMode }
				data-starting-number={ startingNumber }
				data-ending-number={ endingNumber }
				data-starting-letter={ safeStartLetter }
				data-ending-letter={ safeEndLetter }
				data-theater-starting-number={ theaterStartingNumber }
				data-theater-ending-number={ theaterEndingNumber }
				data-csv-items={ activeMode === 'csv' ? JSON.stringify( safeCsvItems ) : undefined }
				data-exclude-previous-winners={ excludePreviousWinners ? 'true' : 'false' }
				data-raffle-duration={ raffleDuration }
				data-fullscreen={ fullscreen }
				data-animation-type={ animationType }
			>
				{ safeCustomTitle && (
					<h3 className="raffle-title" style={ textStyle }>
						{ safeCustomTitle }
					</h3>
				) }
				{ ! hideSubtitle && (
					<p className="raffle-message" style={ textStyle }>
						{ activeMode === 'theater' && (
							<>
								{ __( 'Raffling between', 'animated-raffle-winner' ) }{ ' ' }
								<strong style={ accentStyle }>{ `${ safeStartLetter }${ theaterStartingNumber }` }</strong> { __( 'and', 'animated-raffle-winner' ) }{ ' ' }
								<strong style={ accentStyle }>{ `${ safeEndLetter }${ theaterEndingNumber }` }</strong>
							</>
						) }
						{ activeMode === 'csv' && (
							<>
								{ __( 'Raffling among', 'animated-raffle-winner' ) }{ ' ' }
								<strong style={ accentStyle }>{ safeCsvItems.length }</strong>{ ' ' }
								{ safeCsvItems.length === 1
									? __( 'participant', 'animated-raffle-winner' )
									: __( 'participants', 'animated-raffle-winner' ) }
							</>
						) }
						{ activeMode === 'numbers' && (
							<>
								{ __( 'Raffling between', 'animated-raffle-winner' ) }{ ' ' }
								<strong style={ accentStyle }>{ startingNumber }</strong> { __( 'and', 'animated-raffle-winner' ) }{ ' ' }
								<strong style={ accentStyle }>{ endingNumber }</strong>
							</>
						) }
					</p>
				) }
				<button
					className="raffle-button"
					style={ buttonStyle }
					type="button"
					data-draw-label={ __( 'Draw', 'animated-raffle-winner' ) }
					data-draw-again-label={ __( 'Draw again', 'animated-raffle-winner' ) }
					data-exhausted-label={ __( 'All winners drawn', 'animated-raffle-winner' ) }
					data-reset-label={ __( 'Reset raffle', 'animated-raffle-winner' ) }
					data-history-label={ __( 'Previous winners:', 'animated-raffle-winner' ) }
					data-exit-fullscreen-label={ __( 'Exit fullscreen', 'animated-raffle-winner' ) }
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
