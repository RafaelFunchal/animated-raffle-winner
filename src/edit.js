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
import { useBlockProps, InspectorControls, PanelColorSettings, MediaUpload, MediaUploadCheck, getGradientValueBySlug } from '@wordpress/block-editor';

/**
 * WordPress components
 */
import { PanelBody, TextControl, TextareaControl, RangeControl, ToggleControl, SelectControl, CheckboxControl, Button, ButtonGroup, FormFileUpload, Notice } from '@wordpress/components';
import { useState } from '@wordpress/element';

/**
 * Lets webpack process CSS, SASS or SCSS files referenced in JavaScript files.
 * Those files can contain any CSS code that gets applied to the editor.
 *
 * @see https://www.npmjs.com/package/@wordpress/scripts#using-css
 */
import './editor.scss';

const LETTERS = Array.from( { length: 26 }, ( _, index ) => {
	const letter = String.fromCharCode( 65 + index );
	return { label: letter, value: letter };
} );

const MAX_CSV_FILE_SIZE = 1024 * 1024; // 1 MB max file size
const MAX_CSV_RAW_LENGTH = 200000; // 200 KB max stored raw content
const MAX_CSV_ITEMS = 5000; // Maximum number of participants
const MAX_ITEM_LENGTH = 120; // Maximum characters per participant name

/**
 * Sanitize a single participant name to prevent XSS, control-character injection,
 * and spreadsheet formula injection.
 *
 * @param {string} value Raw cell string.
 * @return {string} Sanitized participant name.
 */
function sanitizeParticipantName( value ) {
	if ( typeof value !== 'string' ) {
		return '';
	}

	return value
		// Remove ASCII and Unicode control characters
		.replace( /[\u0000-\u001F\u007F-\u009F]/g, '' )
		// Strip HTML tags and angle brackets
		.replace( /<[^>]*>/g, '' )
		.replace( /[<>]/g, '' )
		// Strip leading CSV formula triggers (=, +, @, or tab/carriage return)
		.replace( /^[=+@\t\r]+/, '' )
		.trim()
		.slice( 0, MAX_ITEM_LENGTH );
}

/**
 * Detect the column delimiter for a CSV line outside of quotes.
 *
 * @param {string} line Raw CSV line.
 * @return {string} Delimiter character (',', ';', or '\t').
 */
function detectDelimiter( line ) {
	let inQuotes = false;
	const counts = { ',': 0, ';': 0, '\t': 0 };

	for ( let i = 0; i < line.length; i++ ) {
		const char = line[ i ];
		if ( char === '"' ) {
			if ( inQuotes && line[ i + 1 ] === '"' ) {
				i++;
			} else {
				inQuotes = ! inQuotes;
			}
		} else if ( ! inQuotes && counts[ char ] !== undefined ) {
			counts[ char ]++;
		}
	}

	if ( counts[ ',' ] > 0 ) {
		return ',';
	}
	if ( counts[ ';' ] > 0 ) {
		return ';';
	}
	if ( counts[ '\t' ] > 0 ) {
		return '\t';
	}
	return ',';
}

/**
 * Parse a single CSV line into an array of sanitized column strings, respecting quotes.
 *
 * @param {string} line      Raw CSV line.
 * @param {string} delimiter Column delimiter character.
 * @return {string[]} Array of sanitized column values.
 */
function parseCsvRow( line, delimiter = ',' ) {
	const trimmed = line.trim();
	if ( ! trimmed ) {
		return [];
	}

	const cells = [];
	let current = '';
	let inQuotes = false;

	for ( let i = 0; i < trimmed.length; i++ ) {
		const char = trimmed[ i ];
		if ( char === '"' ) {
			if ( inQuotes && trimmed[ i + 1 ] === '"' ) {
				current += '"';
				i++;
			} else {
				inQuotes = ! inQuotes;
			}
		} else if ( char === delimiter && ! inQuotes ) {
			cells.push( sanitizeParticipantName( current ) );
			current = '';
		} else {
			current += char;
		}
	}
	cells.push( sanitizeParticipantName( current ) );

	return cells;
}

/**
 * Inspect raw CSV text and return metadata for each detected column.
 *
 * @param {string}  rawText    Raw CSV text.
 * @param {boolean} skipHeader Whether the first row is a header row.
 * @return {Array<{index: number, header: string, sample: string}>} Detected columns.
 */
function getCsvColumnsInfo( rawText, skipHeader = false ) {
	if ( ! rawText || typeof rawText !== 'string' ) {
		return [];
	}

	const boundedText = rawText.slice( 0, MAX_CSV_RAW_LENGTH );
	const lines = boundedText
		.replace( /^\uFEFF/, '' )
		.split( /\r?\n|\r/ )
		.map( ( line ) => line.trim() )
		.filter( Boolean );

	if ( lines.length === 0 ) {
		return [];
	}

	const delimiter = detectDelimiter( lines[ 0 ] );
	const firstRow = parseCsvRow( lines[ 0 ], delimiter );
	const secondRow = lines.length > 1 ? parseCsvRow( lines[ 1 ], delimiter ) : [];
	const columnCount = Math.min( 20, Math.max( firstRow.length, secondRow.length ) );

	const columns = [];
	for ( let index = 0; index < columnCount; index++ ) {
		const header = skipHeader ? ( firstRow[ index ] || '' ) : '';
		const sample = skipHeader ? ( secondRow[ index ] || '' ) : ( firstRow[ index ] || '' );
		columns.push( { index, header, sample } );
	}

	return columns;
}

/**
 * Parse raw CSV content into an array of sanitized participant strings
 * using the selected column indices.
 *
 * @param {string}   rawText         Raw CSV text.
 * @param {boolean}  skipHeader      Whether to skip the first non-empty row.
 * @param {number[]} selectedColumns Array of 0-based column indices to display.
 * @param {boolean}  useSeparator    Whether to join columns with ' - ' instead of ' '.
 * @return {string[]} Array of participant display strings.
 */
function parseCsvParticipants( rawText, skipHeader = false, selectedColumns = [ 0 ], useSeparator = false ) {
	if ( ! rawText || typeof rawText !== 'string' ) {
		return [];
	}

	const boundedText = rawText.slice( 0, MAX_CSV_RAW_LENGTH );
	const lines = boundedText
		.replace( /^\uFEFF/, '' )
		.split( /\r?\n|\r/ )
		.map( ( line ) => line.trim() )
		.filter( Boolean );

	if ( lines.length === 0 ) {
		return [];
	}

	const delimiter = detectDelimiter( lines[ 0 ] );
	const rows = skipHeader ? lines.slice( 1 ) : lines;
	const validColumns = Array.isArray( selectedColumns ) && selectedColumns.length > 0
		? selectedColumns.filter( ( col ) => Number.isInteger( col ) && col >= 0 && col < 20 )
		: [ 0 ];
	const columnsToUse = validColumns.length > 0 ? validColumns : [ 0 ];
	const joiner = useSeparator ? ' - ' : ' ';

	return rows
		.slice( 0, MAX_CSV_ITEMS )
		.map( ( line ) => {
			const rowCells = parseCsvRow( line, delimiter );
			const pickedValues = columnsToUse
				.map( ( colIndex ) => rowCells[ colIndex ] || '' )
				.filter( Boolean );
			return sanitizeParticipantName( pickedValues.join( joiner ) );
		} )
		.filter( Boolean );
}

/**
 * The edit function describes the structure of your block in the context of the
 * editor. This represents what the editor will render when the block is used.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 *
 * @return {Element} Element to render.
 */
export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		raffleMode = 'numbers',
		startingNumber,
		endingNumber,
		startingLetter = 'A',
		endingLetter = 'C',
		theaterStartingNumber = 1,
		theaterEndingNumber = 10,
		csvFileName = '',
		csvRawContent = '',
		csvSkipHeader = false,
		csvSelectedColumns = [ 0 ],
		csvUseSeparator = false,
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
		backgroundImageId,
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

	const blockProps = useBlockProps( {
		className: 'animated-raffle-winner-block',
	} );

	const animationOptions = [
		{ label: __( 'Fireworks', 'animated-raffle-winner' ), value: 'fireworks' },
		{ label: __( 'Confetti', 'animated-raffle-winner' ), value: 'confetti' },
		{ label: __( 'Stars', 'animated-raffle-winner' ), value: 'stars' },
		{ label: __( 'Balloons', 'animated-raffle-winner' ), value: 'balloons' },
	];
	const textSizeOptions = [
		{ label: __( 'Extra Small', 'animated-raffle-winner' ), value: 'very-small' },
		{ label: __( 'Small', 'animated-raffle-winner' ), value: 'small' },
		{ label: __( 'Medium', 'animated-raffle-winner' ), value: 'medium' },
		{ label: __( 'Large', 'animated-raffle-winner' ), value: 'large' },
		{ label: __( 'Extra Large', 'animated-raffle-winner' ), value: 'super-large' },
	];
	const modeTabs = [
		{ name: 'numbers', title: __( 'Numbers', 'animated-raffle-winner' ) },
		{ name: 'theater', title: __( 'Theater', 'animated-raffle-winner' ) },
		{ name: 'csv', title: __( 'CSV', 'animated-raffle-winner' ) },
	];
	const activeMode = [ 'numbers', 'theater', 'csv' ].includes( raffleMode )
		? raffleMode
		: 'numbers';
	const tabIdPrefix = `arw-tab-${ clientId || 'block' }`;

	const handleTabKeyDown = ( event, index ) => {
		let nextIndex = null;
		if ( event.key === 'ArrowRight' ) {
			nextIndex = ( index + 1 ) % modeTabs.length;
		} else if ( event.key === 'ArrowLeft' ) {
			nextIndex = ( index - 1 + modeTabs.length ) % modeTabs.length;
		} else if ( event.key === 'Home' ) {
			nextIndex = 0;
		} else if ( event.key === 'End' ) {
			nextIndex = modeTabs.length - 1;
		}

		if ( nextIndex !== null ) {
			event.preventDefault();
			const nextTab = modeTabs[ nextIndex ];
			setAttributes( { raffleMode: nextTab.name } );
			const nextButton = event.currentTarget.parentElement?.querySelector(
				`#${ tabIdPrefix }-tab-${ nextTab.name }`
			);
			nextButton?.focus();
		}
	};

	const [ csvError, setCsvError ] = useState( '' );

	const handleCsvFileUpload = ( event ) => {
		const file = event.target?.files?.[ 0 ];
		if ( ! file ) {
			return;
		}

		setCsvError( '' );

		// Validate file extension and MIME type
		const fileName = ( file.name || '' ).replace( /[\u0000-\u001F\u007F-\u009F<>]/g, '' ).slice( 0, 100 );
		const isAllowedExtension = /\.(csv|txt)$/i.test( fileName );
		const isAllowedMime = ! file.type || [ 'text/csv', 'text/plain', 'application/csv', 'application/vnd.ms-excel' ].includes( file.type );

		if ( ! isAllowedExtension || ! isAllowedMime ) {
			setCsvError( __( 'Invalid file type. Please select a .csv or .txt file.', 'animated-raffle-winner' ) );
			return;
		}

		// Validate file size (max 1 MB) to prevent browser/editor DoS
		if ( file.size > MAX_CSV_FILE_SIZE ) {
			setCsvError( __( 'File is too large. Maximum allowed size is 1 MB.', 'animated-raffle-winner' ) );
			return;
		}

		const reader = new window.FileReader();
		reader.onerror = () => {
			setCsvError( __( 'Failed to read the selected CSV file.', 'animated-raffle-winner' ) );
		};
		reader.onload = ( loadEvent ) => {
			const rawContent = typeof loadEvent.target?.result === 'string'
				? loadEvent.target.result.slice( 0, MAX_CSV_RAW_LENGTH )
				: '';
			const detectedCols = getCsvColumnsInfo( rawContent, csvSkipHeader );
			const maxColIndex = Math.max( 0, detectedCols.length - 1 );
			const validSelectedCols = ( Array.isArray( csvSelectedColumns ) ? csvSelectedColumns : [ 0 ] )
				.filter( ( col ) => Number.isInteger( col ) && col >= 0 && col <= maxColIndex );
			const nextSelectedCols = validSelectedCols.length > 0 ? validSelectedCols : [ 0 ];
			const parsedItems = parseCsvParticipants( rawContent, csvSkipHeader, nextSelectedCols, csvUseSeparator );
			setAttributes( {
				csvFileName: fileName,
				csvRawContent: rawContent,
				csvSelectedColumns: nextSelectedCols,
				csvItems: parsedItems,
			} );
		};
		reader.readAsText( file );
	};

	const safeCsvItems = Array.isArray( csvItems ) ? csvItems : [];
	const csvColumnsInfo = getCsvColumnsInfo( csvRawContent, csvSkipHeader );
	const activeSelectedColumns = Array.isArray( csvSelectedColumns ) && csvSelectedColumns.length > 0
		? csvSelectedColumns
		: [ 0 ];

	const handleToggleCsvColumn = ( colIndex, isChecked ) => {
		let nextColumns;
		if ( isChecked ) {
			nextColumns = [ ...new Set( [ ...activeSelectedColumns, colIndex ] ) ].sort( ( a, b ) => a - b );
		} else {
			nextColumns = activeSelectedColumns.filter( ( item ) => item !== colIndex );
			if ( nextColumns.length === 0 ) {
				nextColumns = [ 0 ];
			}
		}

		setAttributes( {
			csvSelectedColumns: nextColumns,
			csvItems: parseCsvParticipants( csvRawContent, csvSkipHeader, nextColumns, csvUseSeparator ),
		} );
	};

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Raffle Settings', 'animated-raffle-winner' ) }>
					<div
						className="arw-mode-tabs"
						role="tablist"
						aria-label={ __( 'Raffle Mode', 'animated-raffle-winner' ) }
					>
						{ modeTabs.map( ( tab, index ) => {
							const isSelected = activeMode === tab.name;
							return (
								<button
									key={ tab.name }
									type="button"
									role="tab"
									id={ `${ tabIdPrefix }-tab-${ tab.name }` }
									aria-selected={ isSelected }
									aria-controls={ `${ tabIdPrefix }-panel-${ tab.name }` }
									tabIndex={ isSelected ? 0 : -1 }
									className={ `arw-mode-tab${ isSelected ? ' is-active' : '' }` }
									onClick={ () => setAttributes( { raffleMode: tab.name } ) }
									onKeyDown={ ( event ) => handleTabKeyDown( event, index ) }
								>
									{ tab.title }
								</button>
							);
						} ) }
					</div>

					<div
						role="tabpanel"
						id={ `${ tabIdPrefix }-panel-${ activeMode }` }
						aria-labelledby={ `${ tabIdPrefix }-tab-${ activeMode }` }
						className="arw-mode-tabpanel"
					>
						{ activeMode === 'numbers' && (
							<>
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
							</>
						) }

						{ activeMode === 'theater' && (
							<>
								<SelectControl
									label={ __( 'Starting Letter', 'animated-raffle-winner' ) }
									value={ startingLetter }
									options={ LETTERS }
									onChange={ ( value ) =>
										setAttributes( { startingLetter: value } )
									}
									help={ __( 'First row/section letter (A to Z)', 'animated-raffle-winner' ) }
								/>
								<SelectControl
									label={ __( 'Ending Letter', 'animated-raffle-winner' ) }
									value={ endingLetter }
									options={ LETTERS }
									onChange={ ( value ) =>
										setAttributes( { endingLetter: value } )
									}
									help={ __( 'Last row/section letter (A to Z)', 'animated-raffle-winner' ) }
								/>
								<TextControl
									label={ __( 'Starting Number', 'animated-raffle-winner' ) }
									type="number"
									value={ theaterStartingNumber }
									onChange={ ( value ) => {
										const num = parseInt( value, 10 );
										if ( ! isNaN( num ) && num >= 1 && num <= 9999 ) {
											setAttributes( { theaterStartingNumber: num } );
										}
									} }
									help={ __( 'Lowest seat/item number (1 to 9999)', 'animated-raffle-winner' ) }
								/>
								<TextControl
									label={ __( 'Ending Number', 'animated-raffle-winner' ) }
									type="number"
									value={ theaterEndingNumber }
									onChange={ ( value ) => {
										const num = parseInt( value, 10 );
										if ( ! isNaN( num ) && num >= 1 && num <= 9999 ) {
											setAttributes( { theaterEndingNumber: num } );
										}
									} }
									help={ __( 'Highest seat/item number (1 to 9999)', 'animated-raffle-winner' ) }
								/>
								<p className="arw-mode-summary">
									{ __( 'Range preview:', 'animated-raffle-winner' ) }{ ' ' }
									<strong>
										{ `${ startingLetter }${ theaterStartingNumber }` } – { `${ endingLetter }${ theaterEndingNumber }` }
									</strong>
								</p>
							</>
						) }

						{ activeMode === 'csv' && (
							<>
								<div className="arw-csv-upload-actions">
									<FormFileUpload
										accept=".csv,text/csv,.txt"
										onChange={ handleCsvFileUpload }
										render={ ( { openFileDialog } ) => (
											<Button variant="secondary" onClick={ openFileDialog }>
												{ csvFileName
													? __( 'Replace CSV File', 'animated-raffle-winner' )
													: __( 'Upload CSV File', 'animated-raffle-winner' ) }
											</Button>
										) }
									/>
									{ ( csvFileName || csvRawContent ) && (
										<Button
											variant="tertiary"
											isDestructive
											onClick={ () => {
												setCsvError( '' );
												setAttributes( {
													csvFileName: '',
													csvRawContent: '',
													csvItems: [],
												} );
											} }
										>
											{ __( 'Clear', 'animated-raffle-winner' ) }
										</Button>
									) }
								</div>
								{ csvError && (
									<Notice
										status="error"
										isDismissible={ false }
									>
										{ csvError }
									</Notice>
								) }
								{ csvFileName && (
									<p className="arw-csv-filename">
										{ __( 'File:', 'animated-raffle-winner' ) } <strong>{ csvFileName }</strong>
									</p>
								) }
								<ToggleControl
									label={ __( 'Skip first row (header)', 'animated-raffle-winner' ) }
									checked={ Boolean( csvSkipHeader ) }
									onChange={ ( value ) => {
										const nextSkip = Boolean( value );
										setAttributes( {
											csvSkipHeader: nextSkip,
											csvItems: parseCsvParticipants( csvRawContent, nextSkip, activeSelectedColumns, csvUseSeparator ),
										} );
									} }
									help={ __( 'Ignore the first line if your CSV includes column titles', 'animated-raffle-winner' ) }
								/>
								{ csvColumnsInfo.length > 1 && (
									<div className="arw-csv-columns" role="group" aria-label={ __( 'Columns to display', 'animated-raffle-winner' ) }>
										<p className="arw-csv-columns-title">
											{ __( 'Columns to display', 'animated-raffle-winner' ) }
										</p>
										{ csvColumnsInfo.map( ( col ) => {
											const colNumber = col.index + 1;
											let label = col.header
												? `${ __( 'Column', 'animated-raffle-winner' ) } ${ colNumber }: ${ col.header }`
												: `${ __( 'Column', 'animated-raffle-winner' ) } ${ colNumber }`;
											if ( col.sample ) {
												label += ` (${ col.sample })`;
											}
											return (
												<CheckboxControl
													key={ col.index }
													label={ label }
													checked={ activeSelectedColumns.includes( col.index ) }
													onChange={ ( isChecked ) =>
														handleToggleCsvColumn( col.index, isChecked )
													}
												/>
											);
										} ) }
										{ activeSelectedColumns.length > 1 && (
											<div className="arw-csv-separator-toggle">
												<ToggleControl
													label={ __( 'Show hyphen separator (-)', 'animated-raffle-winner' ) }
													checked={ Boolean( csvUseSeparator ) }
													onChange={ ( value ) => {
														const nextUseSeparator = Boolean( value );
														setAttributes( {
															csvUseSeparator: nextUseSeparator,
															csvItems: parseCsvParticipants(
																csvRawContent,
																csvSkipHeader,
																activeSelectedColumns,
																nextUseSeparator
															),
														} );
													} }
													help={ __( 'When off, selected columns are joined with a space (e.g. First + Last Name).', 'animated-raffle-winner' ) }
												/>
											</div>
										) }
									</div>
								) }
								<TextareaControl
									label={ __( 'CSV Content / Participants', 'animated-raffle-winner' ) }
									value={ csvRawContent }
									rows={ 5 }
									onChange={ ( value ) => {
										const boundedValue = ( value || '' ).slice( 0, MAX_CSV_RAW_LENGTH );
										setAttributes( {
											csvRawContent: boundedValue,
											csvItems: parseCsvParticipants( boundedValue, csvSkipHeader, activeSelectedColumns, csvUseSeparator ),
										} );
									} }
									help={ __( 'Upload a .csv file above or paste CSV rows.', 'animated-raffle-winner' ) }
								/>
								<p className="arw-mode-summary">
									{ __( 'Loaded participants:', 'animated-raffle-winner' ) }{ ' ' }
									<strong>{ safeCsvItems.length }</strong>
									{ safeCsvItems.length > 0 && (
										<>
											<br />
											<span>
												{ __( 'Preview:', 'animated-raffle-winner' ) }{ ' ' }
												<strong>{ safeCsvItems[ 0 ] }</strong>
											</span>
										</>
									) }
								</p>
							</>
						) }
					</div>

					<hr style={ { margin: '16px 0', borderColor: '#ddd' } } />
					<ToggleControl
						label={ __( 'Exclude previous winners (no repeats)', 'animated-raffle-winner' ) }
						checked={ Boolean( excludePreviousWinners ) }
						onChange={ ( value ) =>
							setAttributes( { excludePreviousWinners: Boolean( value ) } )
						}
						help={ __( 'Prevent the same number, seat, or participant from being drawn more than once until reset', 'animated-raffle-winner' ) }
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
					<TextControl
						label={ __( 'Custom Title (optional)', 'animated-raffle-winner' ) }
						value={ customTitle }
						onChange={ ( value ) =>
							setAttributes( {
								customTitle: sanitizeParticipantName( value || '' ),
							} )
						}
						help={ __( 'Optional heading displayed above the raffle message (e.g. Grand Prize Raffle)', 'animated-raffle-winner' ) }
					/>
					<ToggleControl
						label={ __( 'Hide range/participant subtitle', 'animated-raffle-winner' ) }
						checked={ Boolean( hideSubtitle ) }
						onChange={ ( value ) =>
							setAttributes( { hideSubtitle: Boolean( value ) } )
						}
						help={ __( 'Hide the default "Raffling between..." or "Raffling among..." line', 'animated-raffle-winner' ) }
					/>
					<hr style={ { margin: '16px 0', borderColor: '#ddd' } } />
					<MediaUploadCheck>
						<MediaUpload
							onSelect={ ( media ) =>
								setAttributes( {
									backgroundImageUrl: media?.url || undefined,
									backgroundImageId: media?.id || undefined,
								} )
							}
							allowedTypes={ [ 'image' ] }
							value={ backgroundImageId }
							render={ ( { open } ) => (
								<Button variant="secondary" onClick={ open }>
									{ backgroundImageUrl
										? __( 'Replace Background Image', 'animated-raffle-winner' )
										: __( 'Select Background Image', 'animated-raffle-winner' ) }
								</Button>
							) }
						/>
					</MediaUploadCheck>
					{ backgroundImageUrl && (
						<>
							<p>{ __( 'Background image selected.', 'animated-raffle-winner' ) }</p>
							<img
								src={ backgroundImageUrl }
								alt={ __( 'Selected background preview', 'animated-raffle-winner' ) }
								style={ {
									display: 'block',
									width: '100%',
									height: 'auto',
									maxHeight: '120px',
									objectFit: 'cover',
									borderRadius: '6px',
									marginBottom: '10px',
								} }
							/>
							<Button
								variant="tertiary"
								onClick={ () =>
									setAttributes( {
										backgroundImageUrl: undefined,
										backgroundImageId: undefined,
									} )
								}
							>
								{ __( 'Remove Background Image', 'animated-raffle-winner' ) }
							</Button>
						</>
					) }
					<PanelColorSettings
						title={ __( 'Background/Overlay Color', 'animated-raffle-winner' ) }
						colorSettings={ [
							{
								value: backgroundColor,
								onChange: ( value ) => {
									setAttributes( { backgroundColor: value, gradient: undefined } );
								},
								label: __( 'Background/Overlay Color', 'animated-raffle-winner' ),
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
					<RangeControl
						label={ __( 'Background/Overlay Opacity', 'animated-raffle-winner' ) }
						value={ overlayOpacity ?? 100 }
						onChange={ ( value ) =>
							setAttributes( { overlayOpacity: value ?? 100 } )
						}
						min={ 0 }
						max={ 100 }
						step={ 1 }
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
					<p>{ __( 'Text Size', 'animated-raffle-winner' ) }</p>
					<ButtonGroup>
						{ textSizeOptions.map( ( option ) => (
							<Button
								key={ option.value }
								variant={ textSize === option.value ? 'primary' : 'secondary' }
								onClick={ () => setAttributes( { textSize: option.value } ) }
							>
								{ option.label }
							</Button>
						) ) }
					</ButtonGroup>
					<hr style={ { margin: '16px 0', borderColor: '#ddd' } } />
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
				<div className={ `raffle-container text-size-${ textSize || 'medium' } mode-${ activeMode }` } style={ backgroundStyle }>
					{ customTitle && (
						<h3 className="raffle-title" style={ textStyle }>
							{ customTitle }
						</h3>
					) }
					{ ! hideSubtitle && (
						<p className="raffle-message" style={ textStyle }>
							{ activeMode === 'theater' && (
								<>
									{ __( 'Raffling between', 'animated-raffle-winner' ) }{ ' ' }
									<strong style={ accentStyle }>{ `${ startingLetter }${ theaterStartingNumber }` }</strong> { __( 'and', 'animated-raffle-winner' ) }{ ' ' }
									<strong style={ accentStyle }>{ `${ endingLetter }${ theaterEndingNumber }` }</strong>
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
					<button className="raffle-button" style={ buttonStyle } disabled>
						{ __( 'Draw', 'animated-raffle-winner' ) }
					</button>
					<div className="raffle-preview">
						<span className="number-preview" style={ accentStyle }>?</span>
					</div>
					<div className="raffle-config-info">
						<p className="raffle-info">
							{ __( 'Mode:', 'animated-raffle-winner' ) } <strong>{ modeTabs.find( ( tab ) => tab.name === activeMode )?.title }</strong>
						</p>
						<p className="raffle-info">
							{ __( 'No Repeats:', 'animated-raffle-winner' ) } <strong>{ excludePreviousWinners ? __( 'Yes', 'animated-raffle-winner' ) : __( 'No', 'animated-raffle-winner' ) }</strong>
						</p>
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
