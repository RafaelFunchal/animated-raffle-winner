/**
 * Use this file for JavaScript code that you want to run in the front-end
 * on posts/pages that contain this block.
 */

class AnimatedRaffleWinner {
	constructor( container ) {
		this.container = container;
		this.button = container.querySelector( '.raffle-button' );
		this.numberElement = container.querySelector( '.number-result' );
		this.canvas = container.querySelector( '.celebration-canvas' );
		this.ctx = this.canvas ? this.canvas.getContext( '2d' ) : null;

		// Validated allowed animation types
		const allowedAnimationTypes = ['fireworks', 'confetti', 'stars', 'balloons'];
		
		// Parse and validate numeric attributes
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
		
		this.fullscreen = container.getAttribute( 'data-fullscreen' ) === 'true';
		
		// Validate animation type against whitelist
		const animationTypeRaw = container.getAttribute( 'data-animation-type' ) || 'fireworks';
		this.animationType = allowedAnimationTypes.includes( animationTypeRaw )
			? animationTypeRaw
			: 'fireworks';

		this.particles = [];
		this.animationFrame = null;
		this.celebrationActive = false;
		this.keydownHandler = null;

		this.init();
	}

	init() {
		if ( this.button ) {
			this.button.addEventListener( 'click', () => this.startRaffle() );
		}

		if ( this.canvas ) {
			this.resizeCanvas();
			window.addEventListener( 'resize', () => this.resizeCanvas() );
		}
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

		// Stop previous celebration if active
		this.stopCelebration();

		if ( this.fullscreen ) {
			this.container.classList.add( 'fullscreen-active' );
			this.resizeCanvas();
		}

		this.button.disabled = true;
		this.button.classList.add( 'drawing' );
		this.numberElement.classList.remove( 'revealed' );
		this.numberElement.classList.add( 'rolling' );

		const duration = this.raffleDuration * 1000;
		const interval = 100;
		const iterations = duration / interval;
		let counter = 0;

		const animation = setInterval( () => {
			const randomNumber =
				Math.floor(
					Math.random() * ( this.endingNumber - this.startingNumber + 1 )
				) + this.startingNumber;
			this.numberElement.textContent = randomNumber;

			counter++;
			if ( counter >= iterations ) {
				clearInterval( animation );
				this.revealResult();
			}
		}, interval );
	}

	revealResult() {
		const finalNumber =
			Math.floor(
				Math.random() * ( this.endingNumber - this.startingNumber + 1 )
			) + this.startingNumber;

		this.numberElement.textContent = finalNumber;
		this.numberElement.classList.remove( 'rolling' );
		this.numberElement.classList.add( 'revealed' );

		if ( this.button ) {
			this.button.disabled = false;
			this.button.classList.remove( 'drawing' );
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
			if ( this.celebrationActive ) {
				e.preventDefault();
				this.stopCelebration();
				if ( this.fullscreen && this.container.classList.contains( 'fullscreen-active' ) ) {
					this.container.classList.remove( 'fullscreen-active' );
					this.resizeCanvas();
				}
				document.removeEventListener( 'keydown', this.keydownHandler );
				this.keydownHandler = null;
			}
		};

		document.addEventListener( 'keydown', this.keydownHandler );
	}

	stopCelebration() {
		if ( this.animationFrame ) {
			cancelAnimationFrame( this.animationFrame );
			this.animationFrame = null;
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

		this.canvas.classList.add( 'active' );
		this.particles = [];
		this.celebrationActive = true;

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