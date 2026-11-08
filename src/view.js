/**
 * Use this file for JavaScript code that you want to run in the front-end
 * on posts/pages that contain this block.
 */

class AnimatedRaffleWinner {
	constructor( container ) {
		this.container = container;
		this.button = container.querySelector( '.raffle-button' );
		this.resultContainer = container.querySelector( '.raffle-result' );
		this.numberElement = container.querySelector( '.number-result' );
		this.canvas = container.querySelector( '.celebration-canvas' );
		this.ctx = this.canvas ? this.canvas.getContext( '2d' ) : null;
		this.drawLabel = this.button?.getAttribute( 'data-draw-label' ) || 'Draw';
		this.drawAgainLabel = this.button?.getAttribute( 'data-draw-again-label' ) || 'Draw again';
		this.exhaustedLabel = this.button?.getAttribute( 'data-exhausted-label' ) || 'All winners drawn';
		this.resetLabel = this.button?.getAttribute( 'data-reset-label' ) || 'Reset raffle';
		this.historyLabel = this.button?.getAttribute( 'data-history-label' ) || 'Previous winners:';
		this.exitFullscreenLabel = this.button?.getAttribute( 'data-exit-fullscreen-label' ) || 'Exit fullscreen';

		// Validated allowed animation types and raffle modes
		const allowedAnimationTypes = [
			'fireworks',
			'confetti',
			'cannons',
			'coins',
			'stars',
			'sparkles',
			'balloons',
			'hearts',
			'streamers',
			'none',
		];
		const allowedRaffleModes = [ 'numbers', 'theater', 'csv' ];

		const raffleModeRaw = container.getAttribute( 'data-raffle-mode' ) || 'numbers';
		this.raffleMode = allowedRaffleModes.includes( raffleModeRaw )
			? raffleModeRaw
			: 'numbers';

		// Parse and validate numeric attributes for Numbers mode
		const startingNumberRaw = parseInt(
			container.getAttribute( 'data-starting-number' ) || '1',
			10
		);
		const endingNumberRaw = parseInt(
			container.getAttribute( 'data-ending-number' ) || '100',
			10
		);
		const raffleDurationRaw = parseInt(
			container.getAttribute( 'data-raffle-duration' ) || '5',
			10
		);
		const celebrationDurationRaw = parseInt(
			container.getAttribute( 'data-celebration-duration' ) || '8',
			10
		);

		// Validate and constrain numeric values
		this.startingNumber = isNaN( startingNumberRaw ) || startingNumberRaw < -999999 || startingNumberRaw > 999999
			? 1
			: startingNumberRaw;
		this.endingNumber = isNaN( endingNumberRaw ) || endingNumberRaw < -999999 || endingNumberRaw > 999999
			? 100
			: endingNumberRaw;
		this.raffleDuration = isNaN( raffleDurationRaw ) || raffleDurationRaw < 1 || raffleDurationRaw > 60
			? 5
			: raffleDurationRaw;
		this.celebrationDuration = isNaN( celebrationDurationRaw ) || celebrationDurationRaw < 1 || celebrationDurationRaw > 60
			? 8
			: celebrationDurationRaw;

		// Ensure ending number is greater than starting number
		if ( this.endingNumber <= this.startingNumber ) {
			this.endingNumber = this.startingNumber + 1;
		}

		// Parse and validate Theater mode attributes (Letter + Number)
		const startLetterRaw = ( container.getAttribute( 'data-starting-letter' ) || 'A' ).trim().toUpperCase();
		const endLetterRaw = ( container.getAttribute( 'data-ending-letter' ) || 'C' ).trim().toUpperCase();
		const startCode = /^[A-Z]$/.test( startLetterRaw ) ? startLetterRaw.charCodeAt( 0 ) : 65;
		const endCode = /^[A-Z]$/.test( endLetterRaw ) ? endLetterRaw.charCodeAt( 0 ) : 67;
		this.startLetterCode = Math.min( startCode, endCode );
		this.endLetterCode = Math.max( startCode, endCode );

		const theaterStartNumRaw = parseInt(
			container.getAttribute( 'data-theater-starting-number' ) || '1',
			10
		);
		const theaterEndNumRaw = parseInt(
			container.getAttribute( 'data-theater-ending-number' ) || '10',
			10
		);
		const validTheaterStart = isNaN( theaterStartNumRaw ) || theaterStartNumRaw < 1 || theaterStartNumRaw > 9999
			? 1
			: theaterStartNumRaw;
		const validTheaterEnd = isNaN( theaterEndNumRaw ) || theaterEndNumRaw < 1 || theaterEndNumRaw > 9999
			? 10
			: theaterEndNumRaw;
		this.theaterStartingNumber = Math.min( validTheaterStart, validTheaterEnd );
		this.theaterEndingNumber = Math.max( validTheaterStart, validTheaterEnd );

		// Parse and validate CSV items
		this.csvItems = [];
		const csvItemsAttr = container.getAttribute( 'data-csv-items' );
		if ( csvItemsAttr && csvItemsAttr.length <= 500000 ) {
			try {
				const parsed = JSON.parse( csvItemsAttr );
				if ( Array.isArray( parsed ) ) {
					this.csvItems = parsed
						.slice( 0, 5000 )
						.filter( ( item ) => typeof item === 'string' && item.trim().length > 0 )
						.map( ( item ) =>
							item
								.replace( /[\u0000-\u001F\u007F-\u009F]/g, '' )
								.replace( /<[^>]*>/g, '' )
								.replace( /[<>]/g, '' )
								.replace( /^[=+@\t\r]+/, '' )
								.trim()
								.slice( 0, 120 )
						)
						.filter( Boolean );
				}
			} catch ( _e ) {
				this.csvItems = [];
			}
		}
		
		this.fullscreen = container.getAttribute( 'data-fullscreen' ) === 'true';
		this.excludePreviousWinners = container.getAttribute( 'data-exclude-previous-winners' ) === 'true';

		// Validate animation type against whitelist
		const animationTypeRaw = container.getAttribute( 'data-animation-type' ) || 'fireworks';
		this.animationType = allowedAnimationTypes.includes( animationTypeRaw )
			? animationTypeRaw
			: 'fireworks';

		this.drawnValues = new Set();
		this.drawnCsvIndices = new Set();
		this.drawnHistory = [];
		this.rollTimeout = null;
		this.particles = [];
		this.animationFrame = null;
		this.celebrationActive = false;
		this.spawningParticles = false;
		this.keydownHandler = null;
		this.celebrationTimeout = null;
		this.fullscreenCloseBtn = null;
		this.historyContainer = null;
		this.reduceMotion = window.matchMedia &&
			window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

		this.init();
	}

	init() {
		if ( this.button ) {
			if ( this.raffleMode === 'csv' && this.csvItems.length === 0 ) {
				this.button.disabled = true;
			}
			this.button.addEventListener( 'click', () => this.startRaffle() );
		}

		if ( this.fullscreen ) {
			this.ensureFullscreenCloseButton();
		}

		if ( this.excludePreviousWinners ) {
			this.ensureHistoryUI();
		}

		if ( this.canvas ) {
			this.resizeCanvas();
			window.addEventListener( 'resize', () => this.resizeCanvas() );
		}
	}

	/**
	 * Cryptographically unbiased random integer in [min, max] inclusive.
	 *
	 * @param {number} min Minimum integer.
	 * @param {number} max Maximum integer.
	 * @return {number} Random integer in [min, max].
	 */
	getRandomInt( min, max ) {
		const range = max - min + 1;
		if ( range <= 1 ) {
			return min;
		}

		if ( window.crypto && typeof window.crypto.getRandomValues === 'function' ) {
			const maxUint32 = 0xFFFFFFFF;
			const limit = maxUint32 - ( ( maxUint32 + 1 ) % range );
			const buffer = new Uint32Array( 1 );
			let randomUint;
			do {
				window.crypto.getRandomValues( buffer );
				randomUint = buffer[ 0 ];
			} while ( randomUint > limit );
			return min + ( randomUint % range );
		}

		return Math.floor( Math.random() * range ) + min;
	}

	getTotalPoolSize() {
		if ( this.raffleMode === 'theater' ) {
			const letters = this.endLetterCode - this.startLetterCode + 1;
			const nums = this.theaterEndingNumber - this.theaterStartingNumber + 1;
			return letters * nums;
		}
		if ( this.raffleMode === 'csv' ) {
			return this.csvItems.length;
		}
		return this.endingNumber - this.startingNumber + 1;
	}

	isPoolExhausted() {
		if ( ! this.excludePreviousWinners ) {
			return false;
		}
		const total = this.getTotalPoolSize();
		if ( this.raffleMode === 'csv' ) {
			return this.drawnCsvIndices.size >= total;
		}
		return this.drawnValues.size >= total;
	}

	/**
	 * Pick a random value from the configured pool.
	 *
	 * @param {boolean} recordWinner Whether this is the final winner draw.
	 * @return {string} Randomly selected value.
	 */
	getRandomValue( recordWinner = false ) {
		if ( this.raffleMode === 'csv' ) {
			if ( this.csvItems.length === 0 ) {
				return '';
			}

			if ( this.excludePreviousWinners ) {
				const availableIndices = [];
				for ( let i = 0; i < this.csvItems.length; i++ ) {
					if ( ! this.drawnCsvIndices.has( i ) ) {
						availableIndices.push( i );
					}
				}
				if ( availableIndices.length === 0 ) {
					return '';
				}
				const chosenIdx = availableIndices[ this.getRandomInt( 0, availableIndices.length - 1 ) ];
				if ( recordWinner ) {
					this.drawnCsvIndices.add( chosenIdx );
					this.drawnHistory.push( this.csvItems[ chosenIdx ] );
				}
				return this.csvItems[ chosenIdx ];
			}

			const randomIndex = this.getRandomInt( 0, this.csvItems.length - 1 );
			return this.csvItems[ randomIndex ];
		}

		if ( this.raffleMode === 'theater' ) {
			const totalPool = this.getTotalPoolSize();
			if ( this.excludePreviousWinners && totalPool <= 10000 ) {
				const availableSeats = [];
				for ( let c = this.startLetterCode; c <= this.endLetterCode; c++ ) {
					const letter = String.fromCharCode( c );
					for ( let n = this.theaterStartingNumber; n <= this.theaterEndingNumber; n++ ) {
						const seat = `${ letter }${ n }`;
						if ( ! this.drawnValues.has( seat ) ) {
							availableSeats.push( seat );
						}
					}
				}
				if ( availableSeats.length === 0 ) {
					return '';
				}
				const chosenSeat = availableSeats[ this.getRandomInt( 0, availableSeats.length - 1 ) ];
				if ( recordWinner ) {
					this.drawnValues.add( chosenSeat );
					this.drawnHistory.push( chosenSeat );
				}
				return chosenSeat;
			}

			const randomLetterCode = this.getRandomInt( this.startLetterCode, this.endLetterCode );
			const randomNum = this.getRandomInt( this.theaterStartingNumber, this.theaterEndingNumber );
			const seat = `${ String.fromCharCode( randomLetterCode ) }${ randomNum }`;
			if ( recordWinner && this.excludePreviousWinners ) {
				this.drawnValues.add( seat );
				this.drawnHistory.push( seat );
			}
			return seat;
		}

		// Numbers mode
		const totalPool = this.getTotalPoolSize();
		if ( this.excludePreviousWinners ) {
			if ( totalPool <= 10000 ) {
				const availableNums = [];
				for ( let n = this.startingNumber; n <= this.endingNumber; n++ ) {
					const val = String( n );
					if ( ! this.drawnValues.has( val ) ) {
						availableNums.push( val );
					}
				}
				if ( availableNums.length === 0 ) {
					return '';
				}
				const chosenVal = availableNums[ this.getRandomInt( 0, availableNums.length - 1 ) ];
				if ( recordWinner ) {
					this.drawnValues.add( chosenVal );
					this.drawnHistory.push( chosenVal );
				}
				return chosenVal;
			}

			let candidate;
			let attempts = 0;
			do {
				candidate = String( this.getRandomInt( this.startingNumber, this.endingNumber ) );
				attempts++;
			} while ( this.drawnValues.has( candidate ) && attempts < 500 );

			if ( recordWinner ) {
				this.drawnValues.add( candidate );
				this.drawnHistory.push( candidate );
			}
			return candidate;
		}

		return String( this.getRandomInt( this.startingNumber, this.endingNumber ) );
	}

	ensureFullscreenCloseButton() {
		if ( this.fullscreenCloseBtn ) {
			return;
		}
		const btn = document.createElement( 'button' );
		btn.type = 'button';
		btn.className = 'raffle-fullscreen-close';
		btn.hidden = true;
		btn.setAttribute( 'aria-label', this.exitFullscreenLabel );
		btn.setAttribute( 'data-tooltip', this.exitFullscreenLabel );
		btn.setAttribute( 'title', this.exitFullscreenLabel );
		btn.textContent = '×';
		Object.assign( btn.style, {
			position: 'fixed',
			top: '3.5rem',
			right: '1.5rem',
			width: '40px',
			height: '40px',
			padding: '0',
			borderRadius: '50%',
			border: '2px solid rgba(255, 255, 255, 0.85)',
			background: 'rgba(0, 0, 0, 0.55)',
			color: '#fff',
			fontSize: '1.5rem',
			fontWeight: '600',
			lineHeight: '1',
			cursor: 'pointer',
			zIndex: '100002',
			boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
		} );
		btn.addEventListener( 'click', () => this.exitFullscreen() );
		this.container.appendChild( btn );
		this.fullscreenCloseBtn = btn;
	}

	exitFullscreen() {
		this.stopCelebration();
		if ( this.fullscreenCloseBtn ) {
			this.fullscreenCloseBtn.hidden = true;
		}
		if ( this.container.classList.contains( 'fullscreen-active' ) ) {
			this.container.classList.remove( 'fullscreen-active' );
			this.resizeCanvas();
		}
		if ( this.keydownHandler ) {
			document.removeEventListener( 'keydown', this.keydownHandler );
			this.keydownHandler = null;
		}
	}

	ensureHistoryUI() {
		if ( this.historyContainer ) {
			return;
		}
		const wrapper = document.createElement( 'div' );
		wrapper.className = 'raffle-history-wrapper';
		wrapper.hidden = true;

		const listParagraph = document.createElement( 'p' );
		listParagraph.className = 'raffle-history-list';

		const resetBtn = document.createElement( 'button' );
		resetBtn.type = 'button';
		resetBtn.className = 'raffle-reset-button';
		resetBtn.textContent = this.resetLabel;
		resetBtn.addEventListener( 'click', () => this.resetPool() );

		wrapper.appendChild( listParagraph );
		wrapper.appendChild( resetBtn );

		if ( this.resultContainer && this.resultContainer.parentNode ) {
			this.resultContainer.parentNode.insertBefore( wrapper, this.resultContainer.nextSibling );
		} else {
			this.container.appendChild( wrapper );
		}
		this.historyContainer = wrapper;
		this.historyListElement = listParagraph;
	}

	updateHistoryUI() {
		if ( ! this.excludePreviousWinners || ! this.historyContainer || ! this.historyListElement ) {
			return;
		}
		if ( this.drawnHistory.length === 0 ) {
			this.historyContainer.hidden = true;
			this.historyListElement.textContent = '';
			return;
		}
		this.historyContainer.hidden = false;
		this.historyListElement.textContent = `${ this.historyLabel } ${ this.drawnHistory.join( ', ' ) }`;
	}

	resetPool() {
		this.drawnValues.clear();
		this.drawnCsvIndices.clear();
		this.drawnHistory = [];
		this.stopCelebration();
		if ( this.numberElement ) {
			this.numberElement.textContent = '';
			this.numberElement.classList.remove( 'revealed', 'rolling' );
		}
		if ( this.button ) {
			this.button.disabled = this.raffleMode === 'csv' && this.csvItems.length === 0;
			this.button.textContent = this.drawLabel;
		}
		this.updateHistoryUI();
	}

	resizeCanvas() {
		if ( ! this.canvas ) {
			return;
		}
		this.canvas.width = this.container.offsetWidth;
		this.canvas.height = this.container.offsetHeight;
	}

	startRaffle() {
		if ( ! this.numberElement || ! this.button ) {
			return;
		}

		if ( this.raffleMode === 'csv' && this.csvItems.length === 0 ) {
			return;
		}

		if ( this.isPoolExhausted() ) {
			return;
		}

		// Stop previous celebration or pending roll if active
		this.stopCelebration();
		if ( this.rollTimeout ) {
			clearTimeout( this.rollTimeout );
			this.rollTimeout = null;
		}

		if ( this.fullscreen ) {
			this.ensureFullscreenCloseButton();
			if ( this.fullscreenCloseBtn ) {
				this.fullscreenCloseBtn.hidden = false;
			}
			this.container.classList.add( 'fullscreen-active' );
			this.resizeCanvas();
			this.addKeyListener();
		}

		this.button.disabled = true;
		this.button.classList.add( 'drawing' );
		this.numberElement.classList.remove( 'revealed' );
		this.numberElement.classList.add( 'rolling' );
		if ( this.resultContainer ) {
			this.resultContainer.setAttribute( 'aria-live', 'off' );
		}

		const duration = this.raffleDuration * 1000;
		const startTime = window.performance?.now ? window.performance.now() : Date.now();

		const stepRoll = () => {
			const now = window.performance?.now ? window.performance.now() : Date.now();
			const elapsed = now - startTime;

			if ( elapsed >= duration ) {
				this.rollTimeout = null;
				this.revealResult();
				return;
			}

			this.numberElement.textContent = this.getRandomValue( false );

			// Decelerate smoothly during the final 35% of the animation
			const progress = elapsed / duration;
			let nextDelay = 70;
			if ( progress > 0.65 ) {
				const slowProgress = ( progress - 0.65 ) / 0.35;
				nextDelay = Math.round( 70 + Math.pow( slowProgress, 2 ) * 250 );
			}

			this.rollTimeout = setTimeout( stepRoll, nextDelay );
		};

		stepRoll();
	}

	revealResult() {
		const finalWinner = this.getRandomValue( true );

		if ( this.resultContainer ) {
			this.resultContainer.setAttribute( 'aria-live', 'polite' );
		}
		this.numberElement.textContent = finalWinner;
		this.numberElement.classList.remove( 'rolling' );
		this.numberElement.classList.add( 'revealed' );

		this.updateHistoryUI();

		if ( this.button ) {
			this.button.classList.remove( 'drawing' );
			if ( this.isPoolExhausted() ) {
				this.button.disabled = true;
				this.button.textContent = this.exhaustedLabel;
			} else {
				this.button.disabled = false;
				this.button.textContent = this.drawAgainLabel;
			}
		}

		this.startCelebration();
		this.addKeyListener();
	}

	addKeyListener() {
		// Remove previous listener if exists
		if ( this.keydownHandler ) {
			document.removeEventListener( 'keydown', this.keydownHandler );
		}

		// Create new listener
		this.keydownHandler = ( e ) => {
			if ( e.key === 'Escape' && ( this.celebrationActive || this.container.classList.contains( 'fullscreen-active' ) ) ) {
				e.preventDefault();
				this.exitFullscreen();
			}
		};

		document.addEventListener( 'keydown', this.keydownHandler );
	}

	stopCelebration() {
		if ( this.animationFrame ) {
			cancelAnimationFrame( this.animationFrame );
			this.animationFrame = null;
		}
		if ( this.celebrationTimeout ) {
			clearTimeout( this.celebrationTimeout );
			this.celebrationTimeout = null;
		}
		this.celebrationActive = false;
		this.spawningParticles = false;
		this.particles = [];
		if ( this.canvas && this.ctx ) {
			this.ctx.clearRect( 0, 0, this.canvas.width, this.canvas.height );
			this.canvas.classList.remove( 'active' );
		}
	}

	finishCelebrationGracefully() {
		this.spawningParticles = false;
		this.celebrationTimeout = null;
	}

	startCelebration() {
		if ( ! this.canvas || ! this.ctx ) {
			return;
		}

		if ( this.reduceMotion || this.animationType === 'none' ) {
			this.stopCelebration();
			return;
		}

		this.canvas.classList.add( 'active' );
		this.particles = [];
		this.celebrationActive = true;
		this.spawningParticles = true;
		this.celebrationTimeout = setTimeout(
			() => this.finishCelebrationGracefully(),
			this.celebrationDuration * 1000
		);

		// Initial burst for cannons or balloons so it feels immediate on reveal
		if ( this.animationType === 'cannons' ) {
			this.createCannonBurst();
		} else if ( this.animationType === 'balloons' ) {
			for ( let i = 0; i < 8; i++ ) {
				this.createBalloon( true );
			}
		}

		const animate = () => {
			if ( ! this.celebrationActive ) {
				return;
			}

			this.ctx.clearRect( 0, 0, this.canvas.width, this.canvas.height );

			if ( this.spawningParticles ) {
				switch ( this.animationType ) {
					case 'fireworks':
						if ( Math.random() < 0.1 ) {
							this.createFirework();
						}
						break;
					case 'confetti':
						if ( Math.random() < 0.3 ) {
							this.createConfetti();
						}
						break;
					case 'cannons':
						if ( Math.random() < 0.08 ) {
							this.createCannonBurst();
						}
						break;
					case 'coins':
						if ( Math.random() < 0.22 ) {
							this.createCoin();
						}
						break;
					case 'stars':
						if ( Math.random() < 0.2 ) {
							this.createStar();
						}
						break;
					case 'sparkles':
						if ( Math.random() < 0.35 ) {
							this.createSparkle();
						}
						break;
					case 'balloons':
						if ( Math.random() < 0.15 ) {
							this.createBalloon();
						}
						break;
					case 'hearts':
						if ( Math.random() < 0.18 ) {
							this.createHeart();
						}
						break;
					case 'streamers':
						if ( Math.random() < 0.18 ) {
							this.createStreamer();
						}
						break;
				}
			}

			this.updateParticles();
			this.drawParticles();

			if ( ! this.spawningParticles && this.particles.length === 0 ) {
				this.stopCelebration();
				return;
			}

			this.animationFrame = requestAnimationFrame( animate );
		};

		animate();
	}

	createFirework() {
		const x = Math.random() * this.canvas.width;
		const y = Math.random() * ( this.canvas.height * 0.5 );
		const color = `hsl(${ Math.random() * 360 }, 100%, 60%)`;
		const particleCount = 50;

		for ( let i = 0; i < particleCount; i++ ) {
			const angle = ( Math.PI * 2 * i ) / particleCount;
			const velocity = 2 + Math.random() * 3;

			this.particles.push( {
				type: 'firework',
				x,
				y,
				vx: Math.cos( angle ) * velocity,
				vy: Math.sin( angle ) * velocity,
				color,
				life: 1,
				size: 2 + Math.random() * 3,
			} );
		}
	}

	createConfetti() {
		const x = Math.random() * this.canvas.width;
		const y = -20;
		const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a8dadc', '#f1faee'];
		const color = colors[ Math.floor( Math.random() * colors.length ) ];

		this.particles.push( {
			type: 'confetti',
			x,
			y,
			vx: ( Math.random() - 0.5 ) * 2,
			vy: Math.random() * 2 + 1,
			rotation: Math.random() * 360,
			rotationSpeed: ( Math.random() - 0.5 ) * 10,
			color,
			life: 1,
			size: 5 + Math.random() * 5,
			shape: Math.random() > 0.5 ? 'square' : 'rectangle',
		} );
	}

	createStar() {
		const x = Math.random() * this.canvas.width;
		const y = Math.random() * this.canvas.height;
		const color = '#ffd700';

		this.particles.push( {
			type: 'star',
			x,
			y,
			vx: 0,
			vy: 0,
			scale: 0,
			color,
			life: 1,
			size: 20 + Math.random() * 20,
			points: 5,
		} );
	}

	createBalloon( initialWave = false ) {
		const x = Math.random() * this.canvas.width;
		const size = 22 + Math.random() * 18;
		const y = initialWave
			? this.canvas.height + size + Math.random() * 120
			: this.canvas.height + size + 20;
		const palette = [
			{ base: '#ff4d6d', light: '#ff8fa3', dark: '#c9184a' },
			{ base: '#4ecdc4', light: '#a8f0ec', dark: '#1d7874' },
			{ base: '#ffd166', light: '#fff0b3', dark: '#d49b00' },
			{ base: '#8338ec', light: '#c77dff', dark: '#5a189a' },
			{ base: '#3a86ff', light: '#90dbf4', dark: '#1d4ed8' },
			{ base: '#ff9f1c', light: '#ffcaa6', dark: '#d97706' },
			{ base: '#06d6a0', light: '#80ffdb', dark: '#059669' },
		];
		const colorSet = palette[ Math.floor( Math.random() * palette.length ) ];
		const depthScale = size / 40;

		this.particles.push( {
			type: 'balloon',
			x,
			y,
			vx: ( Math.random() - 0.5 ) * 0.4,
			vy: -( 1.4 + depthScale * 1.6 + Math.random() * 0.6 ),
			oscillation: Math.random() * Math.PI * 2,
			oscillationSpeed: 0.04 + Math.random() * 0.03,
			swayAmplitude: 0.6 + Math.random() * 0.6,
			tilt: 0,
			color: colorSet.base,
			lightColor: colorSet.light,
			darkColor: colorSet.dark,
			life: 0.92,
			size,
		} );
	}

	createCannonBurst() {
		const colors = [ '#ff6b6b', '#4ecdc4', '#ffe66d', '#ff9f1c', '#a8dadc', '#c77dff' ];
		const sides = [
			{ x: 0, baseAngle: -Math.PI * 0.35 },
			{ x: this.canvas.width, baseAngle: -Math.PI * 0.65 },
		];

		sides.forEach( ( side ) => {
			for ( let i = 0; i < 18; i++ ) {
				const angle = side.baseAngle + ( Math.random() - 0.5 ) * 0.45;
				const speed = 7 + Math.random() * 7;
				const color = colors[ Math.floor( Math.random() * colors.length ) ];

				this.particles.push( {
					type: 'cannon',
					x: side.x,
					y: this.canvas.height,
					vx: Math.cos( angle ) * speed,
					vy: Math.sin( angle ) * speed,
					rotation: Math.random() * 360,
					rotationSpeed: ( Math.random() - 0.5 ) * 14,
					color,
					life: 1,
					size: 6 + Math.random() * 6,
				} );
			}
		} );
	}

	createCoin() {
		const x = Math.random() * this.canvas.width;
		const y = -25;

		this.particles.push( {
			type: 'coin',
			x,
			y,
			vx: ( Math.random() - 0.5 ) * 1.5,
			vy: 2 + Math.random() * 2.5,
			spin: Math.random() * Math.PI * 2,
			spinSpeed: 0.12 + Math.random() * 0.1,
			life: 1,
			size: 12 + Math.random() * 8,
		} );
	}

	createSparkle() {
		const x = Math.random() * this.canvas.width;
		const y = Math.random() * this.canvas.height;
		const colors = [ '#ffd700', '#fff6cc', '#ffffff', '#ffe066' ];
		const color = colors[ Math.floor( Math.random() * colors.length ) ];

		this.particles.push( {
			type: 'sparkle',
			x,
			y,
			vy: 0.25 + Math.random() * 0.4,
			phase: 0,
			color,
			life: 1,
			size: 10 + Math.random() * 14,
		} );
	}

	createHeart() {
		const x = Math.random() * this.canvas.width;
		const y = this.canvas.height + 30;
		const colors = [ '#ff4d6d', '#ff758f', '#ff8fa3', '#ffb3c1', '#c9184a' ];
		const color = colors[ Math.floor( Math.random() * colors.length ) ];

		this.particles.push( {
			type: 'heart',
			x,
			y,
			vx: ( Math.random() - 0.5 ) * 0.4,
			vy: -( 1.2 + Math.random() * 1.2 ),
			oscillation: Math.random() * Math.PI * 2,
			color,
			life: 1,
			size: 14 + Math.random() * 12,
		} );
	}

	createStreamer() {
		const x = Math.random() * this.canvas.width;
		const y = -40;
		const colors = [ '#ff6b6b', '#4ecdc4', '#ffe66d', '#ff9f1c', '#c77dff', '#f1faee' ];
		const color = colors[ Math.floor( Math.random() * colors.length ) ];

		this.particles.push( {
			type: 'streamer',
			x,
			y,
			vx: ( Math.random() - 0.5 ) * 1,
			vy: 2 + Math.random() * 1.8,
			phase: Math.random() * Math.PI * 2,
			color,
			life: 1,
			length: 28 + Math.random() * 20,
			width: 4 + Math.random() * 3,
		} );
	}

	updateParticles() {
		this.particles = this.particles.filter( ( p ) => {
			switch ( p.type ) {
				case 'firework':
					p.x += p.vx;
					p.y += p.vy;
					p.vy += 0.1;
					p.life -= 0.01;
					break;

				case 'confetti':
					p.x += p.vx;
					p.y += p.vy;
					p.rotation += p.rotationSpeed;
					p.vy += 0.1;
					if ( p.y > this.canvas.height + 20 ) {
						p.life = 0;
					}
					break;

				case 'cannon':
					p.x += p.vx;
					p.y += p.vy;
					p.vx *= 0.99;
					p.vy += 0.22;
					p.rotation += p.rotationSpeed;
					if ( p.y > this.canvas.height + 30 ) {
						p.life = 0;
					}
					break;

				case 'coin':
					p.x += p.vx;
					p.y += p.vy;
					p.vy += 0.08;
					p.spin += p.spinSpeed;
					if ( p.y > this.canvas.height + 30 ) {
						p.life = 0;
					}
					break;

				case 'star':
					if ( p.scale < 1 ) {
						p.scale += 0.05;
					} else {
						p.life -= 0.02;
					}
					break;

				case 'sparkle':
					p.y += p.vy;
					p.phase += 0.12;
					p.life -= 0.018;
					break;

				case 'balloon':
					p.oscillation += p.oscillationSpeed || 0.05;
					p.x += p.vx + Math.sin( p.oscillation ) * ( p.swayAmplitude || 0.7 );
					p.y += p.vy;
					p.tilt = Math.cos( p.oscillation ) * 0.1;
					if ( p.y < -p.size * 2.5 ) {
						p.life = 0;
					}
					break;

				case 'heart':
					p.x += p.vx + Math.sin( p.oscillation ) * 0.6;
					p.y += p.vy;
					p.oscillation += 0.08;
					if ( p.y < -( p.size * 2 ) ) {
						p.life = 0;
					}
					break;

				case 'streamer':
					p.x += p.vx + Math.sin( p.phase ) * 0.8;
					p.y += p.vy;
					p.phase += 0.18;
					if ( p.y > this.canvas.height + ( p.length || 50 ) + 20 ) {
						p.life = 0;
					}
					break;
			}

			return p.life > 0;
		} );
	}

	drawParticles() {
		this.particles.forEach( ( p ) => {
			this.ctx.save();
			this.ctx.globalAlpha = p.life;

			switch ( p.type ) {
				case 'firework':
					this.ctx.fillStyle = p.color;
					this.ctx.beginPath();
					this.ctx.arc( p.x, p.y, p.size, 0, Math.PI * 2 );
					this.ctx.fill();
					break;

				case 'confetti':
				case 'cannon':
					this.ctx.translate( p.x, p.y );
					this.ctx.rotate( ( p.rotation * Math.PI ) / 180 );
					this.ctx.fillStyle = p.color;
					if ( p.shape === 'square' ) {
						this.ctx.fillRect( -p.size / 2, -p.size / 2, p.size, p.size );
					} else {
						this.ctx.fillRect( -p.size / 2, -p.size / 4, p.size, p.size / 2 );
					}
					break;

				case 'coin':
					this.drawCoin( p.x, p.y, p.size, p.spin );
					break;

				case 'star':
					this.ctx.translate( p.x, p.y );
					this.ctx.scale( p.scale, p.scale );
					this.drawStar( 0, 0, p.points, p.size, p.size / 2, p.color );
					break;

				case 'sparkle':
					this.drawSparkle( p.x, p.y, p.size * Math.abs( Math.sin( p.phase ) ), p.color );
					break;

				case 'balloon':
					this.drawBalloon( p );
					break;

				case 'heart':
					this.drawHeart( p.x, p.y, p.size, p.color );
					break;

				case 'streamer':
					this.drawStreamer( p.x, p.y, p.length, p.width, p.phase, p.color );
					break;
			}

			this.ctx.restore();
		} );
	}

	drawStar( cx, cy, points, outerRadius, innerRadius, color ) {
		this.ctx.fillStyle = color;
		this.ctx.strokeStyle = color;
		this.ctx.lineWidth = 2;
		this.ctx.beginPath();

		for ( let i = 0; i < points * 2; i++ ) {
			const radius = i % 2 === 0 ? outerRadius : innerRadius;
			const angle = ( Math.PI * i ) / points - Math.PI / 2;
			const x = cx + Math.cos( angle ) * radius;
			const y = cy + Math.sin( angle ) * radius;

			if ( i === 0 ) {
				this.ctx.moveTo( x, y );
			} else {
				this.ctx.lineTo( x, y );
			}
		}

		this.ctx.closePath();
		this.ctx.fill();
		this.ctx.stroke();
	}

	drawBalloon( p ) {
		const { x, y, size, color, lightColor, darkColor, tilt = 0, oscillation = 0 } = p;
		const rx = size * 0.78;
		const ry = size;

		this.ctx.translate( x, y );

		// Wavy ribbon string trailing below the knot
		const stringLength = size * 1.45;
		const waveOffset = Math.sin( oscillation * 1.5 ) * 6;
		this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
		this.ctx.lineWidth = 1.5;
		this.ctx.lineCap = 'round';
		this.ctx.beginPath();
		this.ctx.moveTo( 0, ry + 4 );
		this.ctx.bezierCurveTo(
			waveOffset,
			ry + stringLength * 0.35,
			-waveOffset,
			ry + stringLength * 0.7,
			waveOffset * 0.5,
			ry + stringLength
		);
		this.ctx.stroke();

		// Slight sway tilt for the balloon body
		this.ctx.rotate( tilt );

		// 3D radial gradient shading
		const grad = this.ctx.createRadialGradient(
			-rx * 0.3,
			-ry * 0.35,
			size * 0.08,
			0,
			0,
			ry * 1.1
		);
		grad.addColorStop( 0, lightColor || '#ffffff' );
		grad.addColorStop( 0.45, color );
		grad.addColorStop( 1, darkColor || color );

		// Teardrop balloon body path (rounded top, tapered bottom neck)
		this.ctx.fillStyle = grad;
		this.ctx.beginPath();
		this.ctx.moveTo( 0, -ry );
		this.ctx.bezierCurveTo( rx * 1.1, -ry, rx * 1.05, ry * 0.35, 0, ry );
		this.ctx.bezierCurveTo( -rx * 1.05, ry * 0.35, -rx * 1.1, -ry, 0, -ry );
		this.ctx.closePath();
		this.ctx.fill();

		// Tied knot at base of balloon
		this.ctx.fillStyle = darkColor || color;
		this.ctx.beginPath();
		this.ctx.moveTo( 0, ry - 1 );
		this.ctx.lineTo( -4, ry + 5 );
		this.ctx.lineTo( 4, ry + 5 );
		this.ctx.closePath();
		this.ctx.fill();

		// Glossy primary specular highlight
		this.ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
		this.ctx.beginPath();
		this.ctx.ellipse( -rx * 0.34, -ry * 0.34, rx * 0.18, ry * 0.28, -0.35, 0, Math.PI * 2 );
		this.ctx.fill();

		// Small secondary highlight dot
		this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
		this.ctx.beginPath();
		this.ctx.arc( -rx * 0.18, -ry * 0.62, rx * 0.06, 0, Math.PI * 2 );
		this.ctx.fill();
	}

	drawCoin( x, y, radius, spin ) {
		const rx = Math.max( 1.5, Math.abs( Math.cos( spin ) ) * radius );
		this.ctx.fillStyle = '#ffd700';
		this.ctx.strokeStyle = '#d4a017';
		this.ctx.lineWidth = 2;
		this.ctx.beginPath();
		this.ctx.ellipse( x, y, rx, radius, 0, 0, Math.PI * 2 );
		this.ctx.fill();
		this.ctx.stroke();

		if ( rx > 4 ) {
			this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
			this.ctx.lineWidth = 1.5;
			this.ctx.beginPath();
			this.ctx.ellipse( x, y, rx * 0.65, radius * 0.65, 0, 0, Math.PI * 2 );
			this.ctx.stroke();
		}
	}

	drawSparkle( x, y, size, color ) {
		if ( size <= 0.5 ) {
			return;
		}
		const inner = size * 0.2;
		this.ctx.translate( x, y );
		this.ctx.fillStyle = color;
		this.ctx.beginPath();
		this.ctx.moveTo( 0, -size );
		this.ctx.quadraticCurveTo( inner, -inner, size, 0 );
		this.ctx.quadraticCurveTo( inner, inner, 0, size );
		this.ctx.quadraticCurveTo( -inner, inner, -size, 0 );
		this.ctx.quadraticCurveTo( -inner, -inner, 0, -size );
		this.ctx.closePath();
		this.ctx.fill();
	}

	drawHeart( x, y, size, color ) {
		this.ctx.translate( x, y );
		this.ctx.fillStyle = color;
		this.ctx.beginPath();
		const topCurveHeight = size * 0.3;
		this.ctx.moveTo( 0, topCurveHeight );
		this.ctx.bezierCurveTo( 0, 0, -size / 2, 0, -size / 2, topCurveHeight );
		this.ctx.bezierCurveTo( -size / 2, ( size + topCurveHeight ) / 2, 0, ( size + topCurveHeight ) / 1.5, 0, size );
		this.ctx.bezierCurveTo( 0, ( size + topCurveHeight ) / 1.5, size / 2, ( size + topCurveHeight ) / 2, size / 2, topCurveHeight );
		this.ctx.bezierCurveTo( size / 2, 0, 0, 0, 0, topCurveHeight );
		this.ctx.closePath();
		this.ctx.fill();
	}

	drawStreamer( x, y, length, width, phase, color ) {
		this.ctx.strokeStyle = color;
		this.ctx.lineWidth = width;
		this.ctx.lineCap = 'round';
		this.ctx.beginPath();
		for ( let i = 0; i <= length; i += 4 ) {
			const offsetX = Math.sin( phase + i * 0.2 ) * 8;
			if ( i === 0 ) {
				this.ctx.moveTo( x + offsetX, y + i );
			} else {
				this.ctx.lineTo( x + offsetX, y + i );
			}
		}
		this.ctx.stroke();
	}
}

document.addEventListener( 'DOMContentLoaded', () => {
	const containers = document.querySelectorAll( '.raffle-container' );
	containers.forEach( ( container ) => {
		new AnimatedRaffleWinner( container );
	} );
} );