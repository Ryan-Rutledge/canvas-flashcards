/******************************
 * fc class                   *
 ******************************/
var fc = {
	// Global variables
	stacks: {}, // List of flashcard stacks
	tiltStacks: [],
	dragStacks: [],
	clickStacks: [],
	swipeStacks: [],
	arrowkeyStacks: [],
	keys: [], // List of stack keys
	SWIPE_DISTANCE: 0.15, // Percentage of flashcard width required to flip a card
	tiltDegrees: 15, // Degrees card tilts
	flipTime: 400, // Length of card flip animation 
	changeTime: 500, // Length of card change animation
	changeHalf: 250,
	MOVEMENT: {LEFT: 0, UP: 1, RIGHT: 2, DOWN: 3, ENTER: 4, LEAVE: 5}, // Direction enum

	// Return direction of cursor/touch movement
	swipeDirection: function(startX, startY, endX, endY) {
		if (Math.abs(startX - endX) > Math.abs(startY - endY)) {
			return (startX > endX) ? fc.MOVEMENT.LEFT : fc.MOVEMENT.RIGHT;
		}
		else {
			return (startY > endY) ? fc.MOVEMENT.UP: fc.MOVEMENT.DOWN;
		}
	},

	// FlashCard constructor
	FlashCard: function() {
		if (arguments.length == 1) {
			this.functions = arguments[0];
		}
		else {
			this.sides = new Array(2);
			this.sides[0] = arguments[0];
			this.sides[1] = arguments[1];
		}
	},

	// Stack constructor
	Stack: function(stack) {
		this.id = stack.getAttribute('id');
		this.cur = 0; // Index of current card
		this.fc_cards = []; // Empty stack of cards
		this.swipeDist = 1;
		this.isFaceUp = true;

		this.tiltEnabled = stack.dataset.fcTilt === '';
		this.dragEnabled = stack.dataset.fcDrag === '';
		this.clickEnabled = stack.dataset.fcClick === '';
		this.swipeEnabled = stack.dataset.fcSwipe === '';
		this.arrowkeysEnabled = stack.dataset.fcArrowkeys === '';
		this.scalingEnabled = stack.dataset.fcScale === '';

		if (this.tiltEnabled) fc.tiltStacks.push(this.id);
		if (this.dragEnabled) fc.dragStacks.push(this.id);
		if (this.clickEnabled) fc.clickStacks.push(this.id);
		if (this.swipeEnabled) fc.swipeStacks.push(this.id);
		if (this.arrowkeysEnabled) fc.arrowkeyStacks.push(this.id);

		// Set front and back of flashcard
		var elements = stack.getElementsByClassName('fc_content');
		if (elements.length) {
			this.usingCanvas = false;
			this.front = document.createElement('div');
			this.back = document.createElement('div');
		}
		else {
			this.usingCanvas = true;
			this.front = document.createElement('canvas');
			this.back = document.createElement('canvas');
		}

		this.front.classList.add('fc_side');
		this.front.classList.add('fc_front');
		this.back.classList.add('fc_side');
		this.back.classList.add('fc_back');

		// Set dimensions
		this.front.height = this.back.height = stack.dataset.fcHeight ? stack.dataset.fcHeight:400;
		this.front.width = this.back.width = stack.dataset.fcWidth ? stack.dataset.fcWidth:600;
		this.aspectRatio = this.front.width / this.front.height;

		// Set card
		this.card = document.createElement('div');
		with (this.card) {
			classList.add('fc_card');
			classList.add('fc_faceup');
			appendChild(this.front);
			appendChild(this.back);
		}

		// Create inner element for margins
		var margin = document.createElement('div');
		margin.appendChild(this.card);
		margin.style.display = 'none';
		this.container = margin;

		// Append to parent
		stack.appendChild(margin);

		this.resetTouchEvent();

		if (!this.usingCanvas) {
			count = elements.length;
			for (var i = 0; i < count; i+=2) {
				var front = stack.firstElementChild;
				stack.removeChild(front);

				var back = stack.firstElementChild;
				stack.removeChild(back);

				this.push(new fc.FlashCard(front, back));
			}
		}
	},

	// Resize all stacks
	resize: function() {
		for (var key in fc.stacks)
			fc.stacks[key].resize();
	},

	swipeListener: function(stacks) {
		for (var s in stacks) {
			fc.stacks[stacks[s]].swipeListener();
		}

		// Touchend
		window.addEventListener('touchend', function(e) {
			if (fc.touchedStack) {
				fc.touchedStack.touchend(e);
			}
			fc.touchedStack = false;
		});
	},

	tiltListener: function(stacks) {
		// Touchmove
		window.addEventListener('touchmove', function(e) {
			if (fc.touchedStack && fc.touchedStack.tiltEnabled) {
				e.touches = [{'pageX': e.clientX, 'pageY': e.clientY}];
				fc.touchedStack.touchmove(e);
			}
		});

		// Mousemove
		window.addEventListener('mousemove', function(e) {
			if (fc.touchedStack && fc.touchedStack.tiltEnabled) {
				e.touches = [{'pageX': e.clientX, 'pageY': e.clientY}];
				fc.touchedStack.touchmove(e);
			}
		});

		return fc;
	},

	arrowkeyListener: function(stacks) {
			window.addEventListener('keydown', function(e) {
				if (e.which >= 37 && e.which <= 40)
					for (var s in stacks) {
						fc.stacks[stacks[s]].moveCard(e.which - 37);
					}
			}, false);

			return fc;
	},

	clickListener: function(stacks) {
		for (var s in stacks) {
			var curStack = fc.stacks[stacks[s]];

			curStack.card.addEventListener('click', function(e) {
				curStack.flipCard();
			});
		}
	},

	dragListener: function(stacks) {
		for (var s in stacks) {
			var curStack = fc.stacks[stacks[s]];

			// MouseDown
			curStack.card.addEventListener('mousedown', function(e) {
				fc.touchedStack = curStack;
				e.touches = [{'pageX': e.clientX, 'pageY': e.clientY}];
				fc.touchedStack.touchstart(e);
				console.log('mousedown');
			});
		}

		// MouseUp
		window.addEventListener('mouseup', function(e) {
			if (fc.touchedStack) {
				e.changedTouches = [{'pageX': e.clientX, 'pageY': e.clientY}];
				fc.touchedStack.touchend(e);
			}
			fc.touchedStack = false;
		});
	},

	rescale: function() {
		var stacks = arguments.length ? arguments:fc.keys;

		for (var s in stacks) {
			var curStack = fc.stacks[stacks[s]]
			curStack.scalingEnabled = true;
			curStack.resize();
		}

		return fc;
	},

	// Create flashcard stacks
	init: function(objectStacks) {
		// Setup Flashcard elements
		var stackElements = document.getElementsByClassName('fc_stack');
		for (var i = 0; i < stackElements.length; i++) {
			fc.keys.push(stackElements[i].getAttribute('id'));
			var newStack = new fc.Stack(stackElements[i]);
			fc.stacks[fc.keys[i]] = newStack;
		}

		// Resize flashcards
		fc.resize();
		window.addEventListener('resize', fc.resize);

		// Get layout engine info
		var LE = 'webkitTransform' in document.body.style ?  'webkit' :'MozTransform' in document.body.style ?  'Moz':'';
		// Check for flip effect support
		fc.animationIsSupported = ((LE === '' ? 'b':LE + 'B') + 'ackfaceVisibility') in document.body.style;


		// Load parameter objects
		for (var key in objectStacks) {
			if (fc.stacks[key].usingCanvas)
				for (var o in objectStacks[key])
					fc.stacks[key].push(new fc.FlashCard(objectStacks[key][o]));
			else 
				for (var o in objectStacks[key])
					fc.stacks[key].fc_cars[o].functions = objectStacks[key][o];

		}

		// If 3d animations are supported
		if (fc.animationIsSupported) {
			// Flip flash card over
			fc.Stack.prototype.flipCard = function(direction) {
				if (!this.animating) {
					this.animating = true;
					var thisStack = this

					if (this.isFaceUp) {
						this.isFaceUp = false;
						var t1 = setTimeout(function() {
							thisStack.card.classList.add('fc_facedown');
							thisStack.card.classList.remove('fc_faceup');
						}, fc.flipTime);

					}
					else {
						this.isFaceUp = true;
						var t1 = setTimeout(function() {
							thisStack.card.classList.add('fc_faceup');
							thisStack.card.classList.remove('fc_facedown');
						}, fc.flipTime);
					}

					if (direction == fc.MOVEMENT.LEFT) {
						thisStack.card.classList.add('fc_flipLeft');
						var t2 = setTimeout(function() {thisStack.card.classList.remove('fc_flipLeft'); ; thisStack.animating = false;}, fc.flipTime);
					}
					else {
						thisStack.card.classList.add('fc_flipRight');
						var t2 = setTimeout(function() {thisStack.card.classList.remove('fc_flipRight'); thisStack.animating = false;}, fc.flipTime);
					}

					thisStack.fc_cards[thisStack.cur].onFlip(thisStack, direction);
				}
			} 

			// Change to adjacent card
			fc.Stack.prototype.changeCard = function(direction) {
				if (!this.animating) {

					this.animating = true;
					var thisStack = this;

					thisStack.fc_cards[thisStack.cur].onChange(thisStack, fc.MOVEMENT.LEAVE);

					switch (direction) {
						case fc.MOVEMENT.UP:
							thisStack.card.classList.add('fc_moveUp');
							var t1 = setTimeout(function() {
								thisStack.showNextCard();
								thisStack.fc_cards[thisStack.cur].onChange(thisStack, fc.MOVEMENT.ENTER);
							}, fc.changeHalf);
							var t2 = setTimeout(function() {thisStack.card.classList.remove('fc_moveUp'); thisStack.animating = false;}, fc.changeTime);
							break;
						default:
							thisStack.card.classList.add('fc_moveDown');
							var t1 = setTimeout(function() {
								thisStack.showPrevCard(thisStack);
								thisStack.fc_cards[thisStack.cur].onChange(thisStack, fc.MOVEMENT.ENTER);
							}, fc.changeHalf);
							var t2 = setTimeout(function() {thisStack.card.classList.remove('fc_moveDown'); thisStack.animating = false;}, fc.changeTime);
							break;
					}

				}
			}
		}
		else { // If 3d animations are not supported
			for (var key in fc.stacks) {
				fc.stacks[key].card.classList.add('fc_noAnimation');
			}

			// Flip flash card over
			fc.Stack.prototype.flipCard = function(direction) {
				this.card.classList.toggle('fc_facedown');
				this.card.classList.toggle('fc_faceup');
				this.isFaceUp = !this.isFaceUp;
				this.card.onFlip(this, direction);
			} 

			// Change to adjacent card
			fc.Stack.prototype.changeCard = function(direction) {
				if (direction === fc.MOVEMENT.UP)
					this.showNextCard();
				else
					this.showPrevCard();
			}
		}

		if (fc.clickStacks.length) fc.clickListener(fc.clickStacks);
		if (fc.dragStacks.length) fc.dragListener(fc.dragStacks);
		if (fc.swipeStacks.length) fc.swipeListener(fc.swipeStacks);
		if (fc.arrowkeyStacks.length) fc.arrowkeyListener(fc.arrowkeyStacks);
		if (fc.tiltStacks.length) fc.tiltListener();
	}
}

/******************************
 * FlashCard class methods    *
 ******************************/

fc.FlashCard.prototype.draw = function(front, back) {
	with (this) {
		if (functions) {
			if (functions.drawFront)
				drawFront(front.getContext('2d'));
			if (functions.drawBack)
				drawBack(back.getContext('2d'));
		}
	}
}
// Called before draw functions
fc.FlashCard.prototype.preDraw = function(ctx) {
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}
// Draws front of flashcard
fc.FlashCard.prototype.drawFront = function(ctx) {
	this.preDraw(ctx);
	this.functions.drawFront(ctx);
}
// Draws back of flashcard
fc.FlashCard.prototype.drawBack = function(ctx) {
	this.preDraw(ctx);
	this.functions.drawBack(ctx);
}

// Called every time card is flipped
fc.FlashCard.prototype.onFlip = function(stack, direction) {
	if (this.functions) {
		if (direction === fc.MOVEMENT.RIGHT) {
			if (this.functions.onFlipRight)
				this.functions.onFlipRight(stack);
		}
		else if (this.functions.onFlipLeft) {
				this.functions.onFlipLeft(stack);
		}

		if (stack.isFaceUp) {
			if (this.functions.onFlipUp) {
				this.functions.onFlipUp(stack);
			}
		}
		else if (this.functions.onFlipDown) {
			this.functions.onFlipDown(stack);
		}

		if (this.functions.onFlip)
			this.functions.onFlip(stack);
	}
}

// Called every time card is changed
fc.FlashCard.prototype.onChange = function(stack, direction) {
	if (this.functions) {
		if (direction === fc.MOVEMENT.LEAVE) {
			if (this.functions.onLeave)
				this.functions.onLeave(stack);
		}
		else if (this.functions.onEnter) {
			this.functions.onEnter(stack);

			if (this.functions.onChange)
				this.functions.onChange(stack);
		}
	}
}
/******************************
 * Stack class methods        *
 ******************************/

// Push card to stack
fc.Stack.prototype.push = function(flashcard) {
	this.fc_cards.push(flashcard);

	if (this.fc_cards.length <= 1) {
		this.container.style.display = '';
		this.resize();

		if (this.usingCanvas) {
			this.draw();
		}
		else {
			this.front.appendChild(flashcard.sides[0]);
			this.back.appendChild(flashcard.sides[1]);
		}
	}
}

// Pop card from stack
fc.Stack.prototype.pop = function() {
	if (this.fc_cards.length <= 1) {
		this.container.style.display = 'none';
	}
	this.keys.pop();
	return this.fc_cards.pop();
}

// Loads content-based flashcard into stack
fc.Stack.prototype.load = function() {
	with (this) {
		front.removeChild(front.firstElementChild);
		back.removeChild(back.firstElementChild);
		front.appendChild(fc_cards[cur].sides[0]);
		back.appendChild(fc_cards[cur].sides[1]);
	}
}

// Resize flashcards while maintaining aspect ratio
fc.Stack.prototype.resize = function() {
	with (this) {
		var h = container.clientHeight;
		var w = container.clientWidth;

		if (h*aspectRatio > w)
			h = w/aspectRatio;
		else
			w = h*aspectRatio;

		card.style.maxHeight = h + 'px';
		card.style.maxWidth = w + 'px';

		swipeDist = w * fc.SWIPE_DISTANCE;

		if (scalingEnabled) {
			front.width = back.width = w;
			front.height = back.height = h;
			draw();
		}
	}
}

// Set height and width of canvas context
fc.Stack.prototype.setContextSize = function(x, y) {
	this.card.width = x;
	this.card.height = y;
}

// Set height and width of canvas
fc.Stack.prototype.setSize = function(x, y) {
	this.card.style.width = x + 'px';
	this.card.style.height = y + 'px';
}

// Switch to, and draw, the previous card
fc.Stack.prototype.showPrevCard = function(thisStack) {
	with (thisStack) {
		cur = (cur + fc_cards.length - 1) % fc_cards.length;
		if (usingCanvas)
			draw();
		else
			load();
	}
}
// Switch to, and draw, the next card
fc.Stack.prototype.showNextCard = function() {
	with (this) {
		cur = (cur + 1) % fc_cards.length;
		if (usingCanvas)
			draw();
		else
			load();
	}
}

// Choose action based on direction
fc.Stack.prototype.moveCard = function(direction) {
	switch (direction) {
		case fc.MOVEMENT.LEFT:
		case fc.MOVEMENT.RIGHT:
			this.flipCard(direction);
			if (this.fc_cards[this.cur].flip)
				this.fc_cards[this.cur].flip(direction);
			break;
		default:
			if (this.fc_cards.length > 1) {
				this.changeCard(direction);
			}
	}
}

// Draw front and back of current card
fc.Stack.prototype.draw = function() {
	if (this.fc_cards.length) this.fc_cards[this.cur].draw(this.front, this.back);
}

// Touch Reset
fc.Stack.prototype.resetTouchEvent = function() {
	this.touchX = null;
	this.touchY = null;
	this.card.classList.remove('fc_tiltLeft');
	this.card.classList.remove('fc_tiltRight');
}

// Touchstart
fc.Stack.prototype.touchstart = function(e) {
	this.touchX = e.touches[0].pageX;
	this.touchY = e.touches[0].pageY;
	e.preventDefault();
}

// TouchEnd
fc.Stack.prototype.touchend = function(e) {
	if (this.touchX != null && this.touchY != null) {
		var endX = e.changedTouches[0].pageX;
		var endY = e.changedTouches[0].pageY;

		// If swipe length is long enough
		if (Math.abs(endX - this.touchX) > this.swipeDist || Math.abs(endY - this.touchY) > this.swipeDist) {
			e.preventDefault();
			this.moveCard(fc.swipeDirection(this.touchX, this.touchY, endX, endY));
		}
	}

	this.resetTouchEvent();
}

// Touchmove
fc.Stack.prototype.touchmove = function(e) {
	if (this.touchX != null && this.touchY != null) {
		e.preventDefault();

		var card = this.card;
		var curX = e.touches[0].pageX;
		var curY = e.touches[0].pageY;
		var dist = Math.max(Math.abs(curX - this.touchX), Math.abs(curY - this.touchY));

		// If length of swipe is long enough
		if (dist > this.swipeDist) {
			switch (fc.swipeDirection(this.touchX, this.touchY, curX, curY)) {
				case fc.MOVEMENT.LEFT:
					card.classList.remove('fc_tiltRight');
					card.classList.add('fc_tiltLeft');
					break;
				case fc.MOVEMENT.RIGHT:
					card.classList.remove('fc_tiltLeft');
					card.classList.add('fc_tiltRight');
					break;
				default:
					card.classList.remove('fc_tiltLeft');
					card.classList.remove('fc_tiltRight');
			}
		}
		else {
			card.classList.remove('fc_tiltLeft');
			card.classList.remove('fc_tiltRight');
		}
	}
}
fc.Stack.prototype.swipeListener = function() {
	var thisStack = this;

	// Touchstart
	thisStack.card.addEventListener('touchstart', function(e) {
		fc.touchedStack = thisStack;
		thisStack.touchstart(e);
		fc.touchedStack.touchstart(e);
	});

	// Touchend
	thisStack.card.addEventListener('touchend', function(e) {
		thisStack.touchend(e);
	});
}
