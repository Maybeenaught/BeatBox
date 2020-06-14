//system
let canvasSize = 660;
let colorfulBackgroundOn = true; //is set to false when redrawBackground is true
let spectrogramOn = true;
let fractalOn = true;
let frameRateOn = false;
let redrawBackground = true; //when false, previous frames aren't overwritten
let htmlHelper;
let konamiCode = [];

//song
let song;
let isSongLoaded = false;
let isSongLoadSuccess = true;
let isSongLoading = false;
let isSongMuted = false;
let songMaxVolume = 1; //range 0-1 that determines the song's volume
let songPosition = 0;
let songPositionAutoUpdate = true;
let numJumpSeconds = 10; //number of seconds to skip forward or back

//sound
let amp;
let fft; //frequency fourier transform
let numFreqBands = 128;
let spectrogram = [];
let currentVolume = songMaxVolume; //volume set from slider

//fractal
let fractalAngleHistory = [];
let fractalAngleHistoryCount = 3; //determines the smoothness of the fractal movement
let heightDivider = 8; //determines starting heights of fractals relative to window height
let rotateOffset = 0;

//frame rate
let fpsHistory = [];

class HtmlHelper {
    canvasDiv = createDiv();
    interactivityDiv = createDiv(); //div to hold buttons, sliders, etc.
    
    //buttons
    buttonListDiv = createDiv(); //div to hold buttons
    frameRateButton = createButton("FR");
    songButton;
    muteButton;

    //sliders
    sliderListDiv = createDiv();
    songPositionSlider;
    volumeSlider;
    volumeSliderMax = 100;

    //called in setup()
    constructor(canvas) {
        this.canvasDiv.class('mediaPlayer'); //set the html class
        this.canvasDiv.child(canvas);

        this.interactivityDiv.class('interactivity');
        this.interactivityDiv.child(this.buttonListDiv);
        this.interactivityDiv.child(this.sliderListDiv);

        this.buttonListDiv.class('buttonList');
        this.buttonListDiv.child(this.frameRateButton);
        this.frameRateButton.mousePressed(toggleFrameRateDisplay);

        this.sliderListDiv.class('sliderList');
    }

    //create elements after song has loaded
    initSongElements() {
        //buttons
        this.songButton = createButton("Play");
        this.songButton.mousePressed(toggleSongPlayback);
        this.buttonListDiv.child(this.songButton);

        this.muteButton = createButton("Mute");
        this.muteButton.mousePressed(toggleMute);
        this.buttonListDiv.child(this.muteButton);
    
        //sliders
        this.songPositionSlider = createSlider(0, song.duration(), 0, 1);
        this.songPositionSlider.style('width', canvasSize + "px");
        this.sliderListDiv.child(this.songPositionSlider);

        loadCurrentVolume();
        this.volumeSlider = createSlider(0, this.volumeSliderMax, currentVolume, 1);
        this.volumeSlider.style('width', canvasSize + "px");
        this.volumeSlider.mouseReleased(saveCurrentVolume);
        this.sliderListDiv.child(this.volumeSlider);
    }
}

class SoundHistoryNode {
    constructor(volume, col) {
        this.volume = volume; //Used to draw spectrogram
        this.col = col; //Used to draw background colors
    }
}

function songLoaded() {
    htmlHelper.initSongElements();
    isSongLoaded = true;
    isSongLoading = false;
    enableVisualFeatures(true);
}

function songLoadFailed() {
    isSongLoadSuccess = false;
    isSongLoading = false;
    enableVisualFeatures(false);
}

function songLoading() {
    isSongLoading = true;
    enableVisualFeatures(false);
}

function enableVisualFeatures(isEnable) {
    colorfulBackgroundOn = isEnable;
    spectrogramOn = isEnable;
    fractalOn = isEnable;
}

function songEnded() {
    htmlHelper.songButton.html("Play");
}

function toggleSongPlayback() {
    if(isSongLoading || !isSongLoadSuccess) {
        return;
    }

    if(song.isPlaying()) {
        htmlHelper.songButton.html("Play");
        songPosition = song.currentTime();
        song.pause();
    }
    else {
        htmlHelper.songButton.html("Pause");
        song.play();
        if(isSongMuted) {
            song.setVolume(0);
        }
        else {
            song.setVolume(currentVolume / htmlHelper.volumeSliderMax);
        }
        song.onended(songEnded);
    }
}

function toggleMute() {
    if(isSongMuted) {
        htmlHelper.volumeSlider.value(currentVolume);
        song.setVolume(currentVolume / htmlHelper.volumeSliderMax);
        htmlHelper.muteButton.html("Mute");
    }
    else {
        htmlHelper.volumeSlider.value(0);
        song.setVolume(0);
        htmlHelper.muteButton.html("Unmute");
    }

    isSongMuted = !isSongMuted;
}

function toggleFrameRateDisplay() {
    frameRateOn = !frameRateOn;
}

//This method exists to mitigate bugs caused by the jump() function
//Shoutout to joepdooper on this thread for finding this solution:
//https://github.com/processing/p5.js-sound/issues/372
function preJump() {
    setTimeout(function() {
        Object.assign(song, {_playing: true});
        song.playMode('restart');
      }, 100);
    song.stop();
    song.playMode('sustain');
}

function keyPressed() {
    let jumpToTime = 0;
    switch(keyCode) {
        case LEFT_ARROW:
            jumpToTime = song.currentTime() - numJumpSeconds;
            if(jumpToTime > 0) {
                preJump();
                song.jump(jumpToTime);
            }
            else {
                preJump();
                song.jump(0);
            }

            checkKonamiCode("LEFT");
            break;

        case RIGHT_ARROW:
            jumpToTime = song.currentTime() + numJumpSeconds;
            if(jumpToTime < song.duration()) {
                preJump();
                song.jump(jumpToTime);
            }
            else {
                song.stop();
            }

            checkKonamiCode("RIGHT");
            break;

        case UP_ARROW:
            checkKonamiCode("UP");
            break;

        case DOWN_ARROW:
            checkKonamiCode("DOWN");
            break;

        case 65: //a
            checkKonamiCode("A");
            break;

        case 66: //b
            checkKonamiCode("B");
            break;

        case 32: //spacebar
            toggleSongPlayback();
            break;

        default:
            checkKonamiCode("");
            break;
    }

    return false; //prevent any default window behaviour
}

function checkKonamiCode(newInput) {
    konamiCode.push(newInput);
    konamiCode.splice(0, 1);

    if(newInput !== "A") {
        return;
    }

    if(
           konamiCode[0] === "UP"
        && konamiCode[1] === "UP"
        && konamiCode[2] === "DOWN"
        && konamiCode[3] === "DOWN"
        && konamiCode[4] === "LEFT"
        && konamiCode[5] === "RIGHT"
        && konamiCode[6] === "LEFT"
        && konamiCode[7] === "RIGHT"
        && konamiCode[8] === "B"
        && konamiCode[9] === "A"
      ) {
        redrawBackground = !redrawBackground;
        resetColorfulBackground();
    }
}

function resetColorfulBackground(reset = !colorfulBackgroundOn) {
    colorfulBackgroundOn = reset;
    background(0, 0, 0);
}

function saveCurrentVolume() {
    storeItem('currentVolume', htmlHelper.volumeSlider.value());
}

function loadCurrentVolume() {
    currentVolume = getItem('currentVolume');
    if(currentVolume === null) {
        currentVolume = songMaxVolume;
    }
}

//setup() called just before draw()
function setup() {

    //song (called first for quicker execution)
    song = loadSound("sounds/Sunrise.mp3", songLoaded, songLoadFailed, songLoading);

    //system
    let canvas = createCanvas(canvasSize, canvasSize);
    canvas.mousePressed(toggleSongPlayback);
    htmlHelper = new HtmlHelper(canvas);
    konamiCode = new Array(10).fill("");
    colorMode(HSB, 100);
    if(!redrawBackground) {
        resetColorfulBackground(false);
    }

    //sound
    amp = new p5.Amplitude();
    fft = new p5.FFT(0.9, numFreqBands);
    spectrogram = new Array(width).fill(new SoundHistoryNode(songMaxVolume / 2, [0, 0, 0]));

    //fractal
    fractalAngleHistory = new Array(fractalAngleHistoryCount).fill(0);

    //frame rate
    fpsHistory = new Array(20).fill(1);
}

//draw() is called repeatedly. It defaults at 60fps but adjusts automatically based on CPU load
function draw() {
    //system
    if(!colorfulBackgroundOn && redrawBackground) {
        background(0, 0, 0);
    }

    //song
    if(isSongLoaded) {
        if(songPositionAutoUpdate) {
            if(song.isPlaying()) {
                htmlHelper.songPositionSlider.value(song.currentTime());
            }
            else {
                htmlHelper.songPositionSlider.value(songPosition);
            }
        }
        
        if(song.isPlaying() && !isSongMuted) {
            currentVolume = htmlHelper.volumeSlider.value();
            song.setVolume(htmlHelper.volumeSlider.value() / htmlHelper.volumeSliderMax);
        }
        else if (isSongMuted && htmlHelper.volumeSlider.value() != 0) {
            toggleMute();
        }
    }
    else if(isSongLoading) {
        printMessage("Loading...");
    }
    else if(!isSongLoadSuccess) {
        printMessage("Song failed to load");
    }
    
    //get frequency info
    fft.analyze();
    let lowEnergy = fft.getEnergy(40, 180);
    let highEnergy = fft.getEnergy(10000, 15000);
    let totalEnergy = fft.getEnergy(40, 15000);

    //get volume info
    let songVolume = amp.getLevel();
    
    //set color variables from vol and freq info
    let currentColorHue = map(highEnergy, 0, 100, 0, 100);
    let currentColorSaturation = map(lowEnergy, 0, 255, 50, 100);
    let currentColorBrightness = map(totalEnergy, 0, 255, 0, 100);
    let currentColor = [currentColorHue, currentColorSaturation, currentColorBrightness];

    if(song.isPlaying()) {
        spectrogram.push(new SoundHistoryNode(songVolume, currentColor));
    }
    else {
        spectrogram.push(new SoundHistoryNode(songMaxVolume / 2, [0, 0, 0]));
    }

    //draw colorful background
    if(colorfulBackgroundOn) {
        drawColorfulBackground();
    }

    //draw spectrogram
    if(spectrogramOn) {
        drawSpectrogram(currentColorHue);
    }

    //remove the oldest soundHistoryNode from spectrogram
    spectrogram.splice(0, 1);

    //fractal
    if(fractalOn) {
        drawFractals(totalEnergy, songVolume, currentColorHue);
    }

    //frame rate
    if(frameRateOn) {
        printAvgFrameRate();
    }
}

function printMessage(message) {
    background(0, 0, 0);
    stroke(0, 0, 100);
    fill(0, 0, 100);
    textSize(60);
    textAlign(CENTER, CENTER);
    text(message, width / 2, height / 2);
}

function drawColorfulBackground() {
    for(let i = 0; i < spectrogram.length; i++) {
        stroke(spectrogram[i].col);
        line(i, 0, i, height);
    }
}

function drawSpectrogram(currentColorHue) {
    noFill();
    beginShape();
    for(let i = 0; i < spectrogram.length; i++) {
        let y = map(spectrogram[i].volume, 0, songMaxVolume, height * 0.6, height * 0.4);

        let oppositeHue = currentColorHue + 50;
        if(oppositeHue > 99) {
            oppositeHue %= 100;
        }
        stroke(oppositeHue, 100, 100)
        vertex(i, y);
    }
    endShape();
}

function drawFractals(totalEnergy, songVolume, currentColorHue) {
    //TODO: find a way to normalize totalEnergy
    let fractalResolution = map(totalEnergy, 0, 100, 16, 10); //more energy => finer resolution
    let colorResolution = map(totalEnergy, 0, 255, 0, 50);

    //average the current fractal angle with previous angles for a smoother transition
    let currentFractalAngle = map(songVolume, 0, currentVolume / htmlHelper.volumeSliderMax, 0, PI);
    fractalAngleHistory.push(currentFractalAngle);
    let fractalAngleAvg = 0;
    for(let i = 0; i < fractalAngleHistory.length; i++) {
        fractalAngleAvg += fractalAngleHistory[i];
    }
    fractalAngleAvg /= fractalAngleHistory.length;
    fractalAngleHistory.splice(0, 1);

    //draw the fractals
    //TODO: draw both fractals at once for better performance
    stroke(currentColorHue, 100, 100);
    
    //bottom fractal
    push();
    translate(width / 2, height);
    drawBranch(width / heightDivider, fractalAngleAvg, fractalResolution, currentColorHue, colorResolution);
    pop();

    //top fractal
    push();
    translate(width / 2, 0);
    scale(1, -1);
    drawBranch(width / heightDivider, fractalAngleAvg, fractalResolution, currentColorHue, colorResolution);
    pop();
}

//drawBranch() is a Recursive function used to draw fractals
//  len: branch length
//  fractalAngle: angle between child branches
//  fractalResolution: branch length pixel count used to break out of the recursion
//  branchColor: the branches color
//  colorResolution: the offset around the color wheel that the child branch will have relative to its parent
function drawBranch(len, fractalAngle, fractalResolution, branchColor, colorResolution) {
    if(!song.isPlaying()) {
        return;
    }

    //draw the branch
    stroke(branchColor, 100, 100);
    line(0, 0, 0, -len);

    //Below code can adjust the look of the fractals. Needs more work to optimize performance

    // let numLines = 3;
    // for(let i = 0; i < numLines; i++) {
    //     if(i == 0) {
    //         line(0, 0, 0, -len);
    //         continue;
    //     }
    //     push();
    //     rotate(TWO_PI / i);
    //     line(0, 0, 0, -len);
    //     pop();

    //     push();
    //     rotate(-(TWO_PI / i));
    //     line(0, 0, 0, -len);
    //     pop();
    // }
  
    //Offset the child branch a certain amount around the color wheel
    branchColor += colorResolution;
    if(branchColor > 99) {
      branchColor %= 100;
    }
  
    //if the current branch length isn't too small, continue recursing
    if(len > fractalResolution) {
      translate(0, -len);

      //right branch
      push();
      rotate(fractalAngle);
      drawBranch(len * 0.67, fractalAngle, fractalResolution, branchColor, colorResolution);
      pop();

      //left branch
      push();
      rotate(-fractalAngle);
      drawBranch(len * 0.67, fractalAngle, fractalResolution, branchColor, colorResolution);
      pop();
    }
}

function printAvgFrameRate() {
    fpsHistory.push(frameRate());
    let avgFr = 0;
    for(let i = 0; i < fpsHistory.length; i++) {
        avgFr += fpsHistory[i];
    }
    avgFr /= fpsHistory.length;
    textAlign(LEFT);
    fill(100, 0, 100);
    stroke(0, 100, 0);
    textSize(12);
    text("FPS: " + avgFr.toFixed(2), 10, height - 10);
    fpsHistory.splice(0, 1);
}
