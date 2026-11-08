/**
 * Registers a new block provided a unique name and an object defining its behavior.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-registration/
 */
import { registerBlockType } from '@wordpress/blocks';

/**
 * Lets webpack process CSS, SASS or SCSS files referenced in JavaScript files.
 * All files containing `style` keyword are bundled together. The code used
 * gets applied both to the front of your site and to the editor.
 *
 * @see https://www.npmjs.com/package/@wordpress/scripts#using-css
 */
import './style.scss';

/**
 * Internal dependencies
 */
import Edit from './edit';
import save from './save';
import metadata from './block.json';
import { useBlockProps, getGradientValueBySlug } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

const v10Deprecated = {
	attributes: {
		startingNumber: { type: 'number', default: 1 },
		endingNumber: { type: 'number', default: 100 },
		raffleDuration: { type: 'number', default: 5 },
		fullscreen: { type: 'boolean', default: false },
		animationType: { type: 'string', default: 'fireworks' },
		textSize: { type: 'string', default: 'medium' },
		backgroundColor: { type: 'string' },
		overlayOpacity: { type: 'number', default: 100 },
		gradient: { type: 'string' },
		buttonColor: { type: 'string' },
		textColor: { type: 'string' },
		buttonTextColor: { type: 'string' },
		backgroundImageUrl: { type: 'string' },
		backgroundImageId: { type: 'number' },
	},
	save( { attributes } ) {
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

		const backgroundStyle = {};
		if ( gradient ) {
			const gradientValue = getGradientValueBySlug( gradient ) || gradient;
			if ( gradientValue && ! /<script|javascript:|on\w+\s*=/i.test( gradientValue ) ) {
				backgroundStyle.background = gradientValue;
			}
		} else if ( backgroundColor ) {
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

		const buttonStyle = {};
		if ( buttonColor && ! /<script|javascript:|on\w+\s*=/i.test( buttonColor ) ) {
			buttonStyle.backgroundColor = buttonColor;
		}
		if ( buttonTextColor && ! /<script|javascript:|on\w+\s*=/i.test( buttonTextColor ) ) {
			buttonStyle.color = buttonTextColor;
		}

		const textStyle = {};
		if ( textColor && ! /<script|javascript:|on\w+\s*=/i.test( textColor ) ) {
			textStyle.color = textColor;
		}

		const accentStyle = {};
		if ( buttonColor && ! /<script|javascript:|on\w+\s*=/i.test( buttonColor ) ) {
			accentStyle.color = buttonColor;
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
	},
};

/**
 * Every block starts by registering a new block type definition.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-registration/
 */
registerBlockType( metadata.name, {
	/**
	 * @see ./edit.js
	 */
	edit: Edit,

	/**
	 * @see ./save.js
	 */
	save,

	deprecated: [ v10Deprecated ],
} );
