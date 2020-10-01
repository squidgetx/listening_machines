/* global createCanvas, mouseIsPressed, fill, mouseX, mouseY, ellipse */

let audioContext;
let spectrum = [];
let spectralCentroid = 0;
let spectralFlatness = 0;
let FFTSIZE = 256
let analyzer, mic;

function createAudioCtx() {
    let AudioContext = window.AudioContext || window.webkitAudioContext;
    return new AudioContext();
}

function createMicSrcFrom(audioCtx) {
    return new Promise((resolve, reject) => {
        /* get microphone access */
        navigator.mediaDevices.getUserMedia({
            audio: true
        }).then((stream) => {
            /* create source from microphone input stream */
            let src = audioCtx.createMediaStreamSource(stream);
            resolve(src);
        }).catch((err) => {
            reject(err)
        });
    });
}

function callback(features) {
    spectrum = features.amplitudeSpectrum
    spectralCentroid = features.spectralCentroid
    spectralFlatness = Math.pow(features.spectralFlatness, 0.3) * 1.2
}

function setupMeydaAnalzer(ctx) {
    createMicSrcFrom(ctx).then((src) => {
        analyzer = Meyda.createMeydaAnalyzer({
            'audioContext': ctx,
            'source': src,
            'bufferSize': FFTSIZE,
            'featureExtractors': [
              "amplitudeSpectrum",
              "spectralCentroid",
              "spectralFlatness",
            ],
            'callback': callback
        });
        analyzer.start();
    }).catch((err) => {
        alert(err);
    })
}

function setupAudio() {
    console.log("Setting up audio")
    userStartAudio();
    let ctx = getAudioContext()
    setupMeydaAnalzer(ctx)

}

function setup() {
    // mimics the autoplay policy

    createCanvas(1024, 1024);

}

function draw() {
    background(color('rgba(255, 250, 240, 0.1)'));
    plot(spectrum);
}

function plot(spectrum) {
    fill('rgba(0,0,0,0)');
    rectMode(RADIUS)
    for (let i = spectrum.length - 1; i >= 0; i--) {
        //for (let i = 0; i < spectrum.length; i++) {
        push()
        let b = map(120 * spectrum[i], 0, 255, 1, 0)
        strokeWeight(map(b, 0, 1, 0, 8))
        let hue = map(spectralCentroid, 0, FFTSIZE / 2, 360, 0).toFixed(0)
        let l = map(i, 0, spectrum.length, 50, 100)
        let s = map(i, 0, spectrum.length, 90, 25)
        let c = color(`hsla(${hue}, ${s}%, ${l}%, ${(1-b).toFixed(0)})`)
        stroke(c)
        translate(width / 2, height / 2)
        rotate(frameCount / 100)
        //let scale = Math.log(i) * 64
        let scale = i * i / 12
        rect(0, 0, scale, scale, spectralFlatness * scale)
        pop()
        //text(spectrum[i].toFixed(2), i * 10, i * 10)
    }

}

function mousePressed() {
    userStartAudio();
    setupAudio();
}