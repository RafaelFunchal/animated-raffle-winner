/**
 * Retrieves the translation of text.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-i18n/
 */
import { __ } from '@wordpress/i18n';

/**
 * React hook that is used to mark the block wrapper element.
 * It provides all the necessary props like the class name.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#useblockprops
 */
import { useBlockProps, InspectorControls, PanelColorSettings, getGradientValueBySlug } from '@wordpress/block-editor';

/**
 * WordPress components
 */
import { PanelBody, TextControl, RangeControl, ToggleControl, SelectControl } from '@wordpress/components';

/**
 * Lets webpack process CSS, SASS or SCSS files referenced in JavaScript files.
 * Those files can contain any CSS code that gets applied to the editor.
 *
 * @see https://www.npmjs.com/package/@wordpress/scripts#using-css
 */
import './editor.scss';

/**
 * The edit function describes the structure of your block in the context of the
 * editor. This represents what the editor will render when the block is used.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 *
 * @return {Element} Element to render.
 */
export default function Edit( { attributes, setAttributes } ) {
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

	const blockProps = useBlockProps( {
		className: 'animated-raffle-winner-block',
	} );

	const animationOptions = [
		{ label: __( 'Fireworks', 'animated-raffle-winner' ), value: 'fireworks' },
		{ label: __( 'Confetti', 'animated-raffle-winner' ), value: 'confetti' },
		{ label: __( 'Stars', 'animated-raffle-winner' ), value: 'stars' },
		{ label: __( 'Balloons', 'animated-raffle-winner' ), value: 'balloons' },
	];

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Raffle Settings', 'animated-raffle-winner' ) }>
					<TextControl
						label={ __( 'Starting Number', 'animated-raffle-winner' ) }
						type="number"
						value={ startingNumber }
						onChange={ ( value ) => {
							const num = parseInt( value, 10 );
							if ( ! isNaN( num ) && num >= -999999 && num <= 999999 ) {
								setAttributes( { startingNumber: num } );
							}
						} }
						help={ __( 'The lowest number in the range (-999999 to 999999)', 'animated-raffle-winner' ) }
					/>
					<TextControl
						label={ __( 'Ending Number', 'animated-raffle-winner' ) }
						type="number"
						value={ endingNumber }
						onChange={ ( value ) => {
							const num = parseInt( value, 10 );
							if ( ! isNaN( num ) && num >= -999999 && num <= 999999 ) {
								setAttributes( { endingNumber: num } );
							}
						} }
						help={ __( 'The highest number in the range (-999999 to 999999)', 'animated-raffle-winner' ) }
					/>
					<RangeControl
						label={ __( 'Raffle Duration (seconds)', 'animated-raffle-winner' ) }
						value={ raffleDuration }
						onChange={ ( value ) =>
							setAttributes( { raffleDuration: value } )
						}
						min={ 1 }
						max={ 15 }
						step={ 1 }
						help={ __( 'Duration of the animation before revealing the result', 'animated-raffle-winner' ) }
					/>
				</PanelBody>
				<PanelBody title={ __( 'Display Settings', 'animated-raffle-winner' ) } initialOpen={ false }>
					<PanelColorSettings
						title={ __( 'Background Color', 'animated-raffle-winner' ) }
						colorSettings={ [
							{
								value: backgroundColor,
								onChange: ( value ) => {
									setAttributes( { backgroundColor: value, gradient: undefined } );
								},
								label: __( 'Background Color', 'animated-raffle-winner' ),
							},
						] }
						gradientSettings={ [
							{
								value: gradient,
								onChange: ( value ) => {
									setAttributes( { gradient: value, backgroundColor: undefined } );
								},
								label: __( 'Background Gradient', 'animated-raffle-winner' ),
							},
						] }
					/>
					<PanelColorSettings
						title={ __( 'Button Background Color', 'animated-raffle-winner' ) }
						colorSettings={ [
							{
								value: buttonColor,
								onChange: ( value ) => {
									setAttributes( { buttonColor: value } );
								},
								label: __( 'Button Background Color', 'animated-raffle-winner' ),
							},
						] }
					/>
					<PanelColorSettings
						title={ __( 'Button Text Color', 'animated-raffle-winner' ) }
						colorSettings={ [
							{
								value: buttonTextColor,
								onChange: ( value ) => {
									setAttributes( { buttonTextColor: value } );
								},
								label: __( 'Button Text Color', 'animated-raffle-winner' ),
							},
						] }
					/>
					<PanelColorSettings
						title={ __( 'Text Color', 'animated-raffle-winner' ) }
						colorSettings={ [
							{
								value: textColor,
								onChange: ( value ) => {
									setAttributes( { textColor: value } );
								},
								label: __( 'Text Color', 'animated-raffle-winner' ),
							},
						] }
					/>
					<ToggleControl
						label={ __( 'Open in Fullscreen', 'animated-raffle-winner' ) }
						checked={ fullscreen }
						onChange={ ( value ) =>
							setAttributes( { fullscreen: value } )
						}
						help={ __( 'When enabled, the raffle will occupy the entire screen during the animation', 'animated-raffle-winner' ) }
					/>
					<SelectControl
						label={ __( 'Celebration Animation Type', 'animated-raffle-winner' ) }
						value={ animationType }
						options={ animationOptions }
						onChange={ ( value ) =>
							setAttributes( { animationType: value } )
						}
						help={ __( 'Choose the celebration style after revealing the result', 'animated-raffle-winner' ) }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<div className="raffle-container" style={ backgroundStyle }>
					<p className="raffle-message" style={ textStyle }>
						{ __( 'Raffling between', 'animated-raffle-winner' ) }{ ' ' }
						<strong style={ accentStyle }>{ startingNumber }</strong> { __( 'and', 'animated-raffle-winner' ) }{ ' ' }
						<strong style={ accentStyle }>{ endingNumber }</strong>
					</p>
					<button className="raffle-button" style={ buttonStyle } disabled>
						{ __( 'Draw', 'animated-raffle-winner' ) }
					</button>
					<div className="raffle-preview">
						<span className="number-preview" style={ accentStyle }>?</span>
					</div>
					<div className="raffle-config-info">
						<p className="raffle-info">
							{ __( 'Duration:', 'animated-raffle-winner' ) } <strong>{ raffleDuration }s</strong>
						</p>
						<p className="raffle-info">
							{ __( 'Fullscreen:', 'animated-raffle-winner' ) } <strong>{ fullscreen ? __( 'Yes', 'animated-raffle-winner' ) : __( 'No', 'animated-raffle-winner' ) }</strong>
						</p>
						<p className="raffle-info">
							{ __( 'Animation:', 'animated-raffle-winner' ) } <strong>{ animationOptions.find( opt => opt.value === animationType )?.label }</strong>
						</p>
					</div>
				</div>
			</div>
		</>
	);
}
