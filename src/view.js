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
		const allowedAnimationTypes = [ 'fireworks', 'confetti', 'stars', 'balloons' ];
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
		btn.setAttribute( 'aria-label', this.exitFullscreenLabel );
		btn.textContent = '×';
		btn.addEventListener( 'click', () => this.exitFullscreen() );
		this.container.appendChild( btn );
		this.fullscreenCloseBtn = btn;
	}

	exitFullscreen() {
		this.stopCelebration();
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
		this.particles = [];
		if ( this.canvas && this.ctx ) {
			this.ctx.clearRect( 0, 0, this.canvas.width, this.canvas.height );
			this.canvas.classList.remove( 'active' );
		}
	}

	startCelebration() {
		if ( ! this.canvas || ! this.ctx ) {
			return;
		}

		if ( this.reduceMotion ) {
			this.stopCelebration();
			return;
		}

		this.canvas.classList.add( 'active' );
		this.particles = [];
		this.celebrationActive = true;
		this.celebrationTimeout = setTimeout( () => this.stopCelebration(), 8000 );

		const animate = () => {
			if ( ! this.celebrationActive ) {
				return;
			}

			this.ctx.clearRect( 0, 0, this.canvas.width, this.canvas.height );

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
				case 'stars':
					if ( Math.random() < 0.2 ) {
						this.createStar();
					}
					break;
				case 'balloons':
					if ( Math.random() < 0.15 ) {
						this.createBalloon();
					}
					break;
			}

			this.updateParticles();
			this.drawParticles();

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

	createBalloon() {
		const x = Math.random() * this.canvas.width;
		const y = this.canvas.height + 50;
		const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a8dadc', '#f1faee'];
		const color = colors[ Math.floor( Math.random() * colors.length ) ];

		this.particles.push( {
			type: 'balloon',
			x,
			y,
			vx: ( Math.random() - 0.5 ) * 0.5,
			vy: -( 1 + Math.random() * 1 ),
			oscillation: Math.random() * Math.PI * 2,
			color,
			life: 1,
			size: 20 + Math.random() * 15,
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
					if ( p.y > this.canvas.height ) {
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

				case 'balloon':
					p.x += p.vx + Math.sin( p.oscillation ) * 0.5;
					p.y += p.vy;
					p.oscillation += 0.1;
					if ( p.y < -50 ) {
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
					this.ctx.translate( p.x, p.y );
					this.ctx.rotate( ( p.rotation * Math.PI ) / 180 );
					this.ctx.fillStyle = p.color;
					if ( p.shape === 'square' ) {
						this.ctx.fillRect( -p.size / 2, -p.size / 2, p.size, p.size );
					} else {
						this.ctx.fillRect( -p.size / 2, -p.size / 4, p.size, p.size / 2 );
					}
					break;

				case 'star':
					this.ctx.translate( p.x, p.y );
					this.ctx.scale( p.scale, p.scale );
					this.drawStar( 0, 0, p.points, p.size, p.size / 2, p.color );
					break;

				case 'balloon':
					this.drawBalloon( p.x, p.y, p.size, p.color );
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

	drawBalloon( x, y, size, color ) {
		this.ctx.fillStyle = color;
		this.ctx.beginPath();
		this.ctx.ellipse( x, y, size * 0.6, size, 0, 0, Math.PI * 2 );
		this.ctx.fill();

		this.ctx.strokeStyle = color;
		this.ctx.lineWidth = 2;
		this.ctx.beginPath();
		this.ctx.moveTo( x, y + size );
		this.ctx.quadraticCurveTo( x + 5, y + size + 10, x, y + size + 20 );
		this.ctx.stroke();

		this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
		this.ctx.beginPath();
		this.ctx.ellipse( x - size * 0.2, y - size * 0.3, size * 0.15, size * 0.25, -0.3, 0, Math.PI * 2 );
		this.ctx.fill();
	}
}

document.addEventListener( 'DOMContentLoaded', () => {
	const containers = document.querySelectorAll( '.raffle-container' );
	containers.forEach( ( container ) => {
		new AnimatedRaffleWinner( container );
	} );
} );