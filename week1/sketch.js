let mic;
let micStarted = false;
let startMicButton;

let startTime = 0;
let speedSlider, sizeSlider, lerpSlider;

// values for storing the lowest and highest recorded volume
let maxVolume = 0.2;
let minVolume = 0.0;

let lastVolume = 0.0;
let lastX = 0.5;
let lastY = 0.0;

// If the window resizes, resize the canvas to fit it
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

// This is an empty object that will hold the sliders we create using the below configs
let sliders = {};

// you can easily add more sliders (or change the existing ones) by modifying this
// sliderConfigs array if you add more objects to it, the sliders will automatically generate
let sliderConfigs = [
    {
        name: "speed",
        min: 0.1,
        max: 2.0,
        current: 0.75,
        step: 0.1,
        x: 30,
        y: 30
    },
    {
        name: "ball size",
        min: 10,
        max: 500,
        current: 100,
        step: 1,
        x: 30,
        y: 50
    },
    {
        name: "smoothing",
        min: 0.01,
        max: 0.99,
        current: 0.75,
        step: 0.01,
        x: 0,
        y: 0
  }
];

function setup() {
    // create our p5.AudioIn() object to use as the input stream
    mic = new p5.AudioIn();
    // We have to start the mic in order to get data coming in

    // set the sliders up

    // This will automatically start the mic when the sketch starts
    startMic();

    // If you have trouble with the mic not getting input, you can try this instead.
    // It will add a button to press to start the mic after the app is started.
    /*startMicButton = createButton("Start Mic");
    startMicButton.position(windowWidth - 120, windowHeight - 119);
    startMicButton.mousePressed(startMic);
    */

    // create the canvas to be the full size of the window
    createCanvas(innerWidth, innerHeight);

    // set the starting time so we can know how much time has elapsed
    startTime = millis();

    // we dont need the stroke
    noStroke();
    background(0);
}

// Check our min/max thresholds
function checkVolumeThresholds(volume) {
    if (volume > maxVolume) maxVolume = volume;
    if (volume < minVolume) minVolume = volume;
}

let threshold = 0
const TOLERANCE = 0.1

let rectangles = []

let rbuf = new RingBuffer(60)
let rbuf_fast = new RingBuffer(10)

function draw() {
    let drawRectangle = function(r) {
        push()
        translate(r.x, r.y)
        rotate(r.theta)
        fill(r.color)
        rect(0, 0, r.value * 200, r.value * 20);
        pop()
        r.theta += r.life / 12
        r.life -= 0.02
    }

    let spawnRectangle = function(value, delta) {
        let r = value * value * 2
        let range_w = r * width
        let range_h = r * height
        let margin_w = (1 - r) * width / 2
        let margin_h = (1 - r) * height / 2
        let x = random(range_w) + margin_w
        let y = random(range_h) + margin_h
        let theta = PI - random(2 * PI)
        let c = 'white'
        let hue = random(360)
        let sat = 85 * Math.sqrt(Math.sqrt(value)) + 50
        let bri = 100
        if (delta > 0.35) {
            bri = 70
        }
        let cs = `hsl(${Math.floor(hue)}, ${Math.floor(sat)}%, ${Math.floor(bri)}%)`
        c = color(cs)

        rectangles.push({
            x: x,
            y: y,
            theta: theta,
            value: r * 2,
            life: value,
            color: c,
        })
    }

    // clear the screen with a transparent background so we can see motion trails
    background(0, 12);
    for (let i = 0; i < rectangles.length; i++) {
        drawRectangle(rectangles[i])
    }
    rectangles = rectangles.filter(x => x.life > 0)

    // get the current RMS (root mean square), essentially volume/loudness
    let volume = mic.getLevel();

    // check the volume against the minimum/maximum variables
    //checkVolumeThresholds(volume);

    // map the loudness to a value between 0.0 and 1.0 using minVolume/maxVolume as boundaries
    let mappedVolume = map(volume, minVolume, maxVolume, 0.0, 1.0);
    rbuf.enq(mappedVolume)
    rbuf_fast.enq(mappedVolume)

    let average = rbuf.peekN(rbuf.size()).reduce((a, b) => a + b, 0) / rbuf.size()
    let faverage = rbuf_fast.peekN(rbuf_fast.size()).reduce((a, b) => a + b, 0) / rbuf_fast.size()

    spawnRectangle(mappedVolume, average < faverage - 0.05 ? 0.5 : 0)

    //set the fill to be a gradient with red towards the bottom and green towards the top
    //fill(map(smoothY,0,innerHeight,0,255),0, map(smoothX,0,innerWidth,100,255), 200);
    fill(255);

    // draw our ball where it belongs, we use % to keep the X value wrapped within the canvas width
    //ellipse(smoothX % innerWidth, smoothY, ballSize, ballSize);

}

// function for starting and stopping the microphone, can be used with a button
function startMic() {

    if (!micStarted) {
        userStartAudio()
        mic.start();
    } else {
        mic.stop();
    }

    micStarted = !micStarted;
}



/**
 * From https://raw.githubusercontent.com/janogonzalez/ringbufferjs/master/index.js
 * Initializes a new empty `RingBuffer` with the given `capacity`, when no
 * value is provided uses the default capacity (50).
 *
 * If provided, `evictedCb` gets run with any evicted elements.
 *
 * @param {Number}
 * @param {Function}
 * @return {RingBuffer}
 * @api public
 */
function RingBuffer(capacity, evictedCb) {
    this._elements = new Array(capacity || 50);
    this._first = 0;
    this._last = 0;
    this._size = 0;
    this._evictedCb = evictedCb;
}

/**
 * Returns the capacity of the ring buffer.
 *
 * @return {Number}
 * @api public
 */
RingBuffer.prototype.capacity = function() {
    return this._elements.length;
};

/**
 * Returns whether the ring buffer is empty or not.
 *
 * @return {Boolean}
 * @api public
 */
RingBuffer.prototype.isEmpty = function() {
    return this.size() === 0;
};

/**
 * Returns whether the ring buffer is full or not.
 *
 * @return {Boolean}
 * @api public
 */
RingBuffer.prototype.isFull = function() {
    return this.size() === this.capacity();
};

/**
 * Peeks at the top element of the queue.
 *
 * @return {Object}
 * @throws {Error} when the ring buffer is empty.
 * @api public
 */
RingBuffer.prototype.peek = function() {
    if (this.isEmpty()) throw new Error('RingBuffer is empty');

    return this._elements[this._first];
};

/**
 * Peeks at multiple elements in the queue.
 *
 * @return {Array}
 * @throws {Error} when there are not enough elements in the buffer.
 * @api public
 */
RingBuffer.prototype.peekN = function(count) {
    if (count > this._size) throw new Error('Not enough elements in RingBuffer');

    var end = Math.min(this._first + count, this.capacity());
    var firstHalf = this._elements.slice(this._first, end);
    if (end < this.capacity()) {
        return firstHalf;
    }
    var secondHalf = this._elements.slice(0, count - firstHalf.length);
    return firstHalf.concat(secondHalf);
};

/**
 * Dequeues the top element of the queue.
 *
 * @return {Object}
 * @throws {Error} when the ring buffer is empty.
 * @api public
 */
RingBuffer.prototype.deq = function() {
    var element = this.peek();

    this._size--;
    this._first = (this._first + 1) % this.capacity();

    return element;
};

/**
 * Dequeues multiple elements of the queue.
 *
 * @return {Array}
 * @throws {Error} when there are not enough elements in the buffer.
 * @api public
 */
RingBuffer.prototype.deqN = function(count) {
    var elements = this.peekN(count);

    this._size -= count;
    this._first = (this._first + count) % this.capacity();

    return elements;
};

/**
 * Enqueues the `element` at the end of the ring buffer and returns its new size.
 *
 * @param {Object} element
 * @return {Number}
 * @api public
 */
RingBuffer.prototype.enq = function(element) {
    this._end = (this._first + this.size()) % this.capacity();
    var full = this.isFull()
    if (full && this._evictedCb) {
        this._evictedCb(this._elements[this._end]);
    }
    this._elements[this._end] = element;

    if (full) {
        this._first = (this._first + 1) % this.capacity();
    } else {
        this._size++;
    }

    return this.size();
};

/**
 * Returns the size of the queue.
 *
 * @return {Number}
 * @api public
 */
RingBuffer.prototype.size = function() {
    return this._size;
};