//system
var beatbox = {
  draw: function () {
    //system
    if (this.canvas.background.redraw) {
      this.canvas.background.reset();
    }
    //song
    if (this.song.isLoaded) {
      if (this.song.positionAutoUpdate) {
        if (this.song.isPlaying()) {
          this.htmlHelper.sliderList.sliders.songPositionSlider.value(
            this.song.currentTime()
          );
        } else {
          this.htmlHelper.sliderList.sliders.songPositionSlider.value(
            this.song.position
          );
        }
      }
      if (this.song.isPlaying() && !this.song.isMuted) {
        this.sound.currentVolume = this.htmlHelper.sliderList.sliders.volumeSlider.value();
        this.song.setVolume(
          this.htmlHelper.sliderList.sliders.volumeSlider.value() /
            this.htmlHelper.sliderList.sliders.volumeSlider.maxValue
        );
      } else if (
        this.song.isMuted &&
        this.htmlHelper.sliderList.sliders.volumeSlider.value() != 0
      ) {
        this.song.toggleMute();
      }
    } else if (this.song.isLoading) {
      printMessage("Loading...");
    } else if (!this.song.isLoadSuccess) {
      printMessage("Song failed to load");
    }
    //get frequency info
    this.sound.fft.analyze();
    //get volume info
    let songVolume = this.sound.amp.getLevel();
    this.canvas.lowEnergy = this.sound.fft.getEnergy(40, 180);
    this.canvas.highEnergy = this.sound.fft.getEnergy(10000, 15000);
    this.canvas.totalEnergy = this.sound.fft.getEnergy(40, 15000);

    //set color variables from vol and freq info
    this.canvas.colorHue = map(this.canvas.highEnergy, 0, 100, 0, 100);
    this.canvas.colorSaturation = map(this.canvas.lowEnergy, 0, 255, 50, 100);
    this.canvas.colorBrightness = map(this.canvas.totalEnergy, 0, 255, 0, 100);
    let currentColor = [
      this.canvas.colorHue,
      this.canvas.colorSaturation,
      this.canvas.colorBrightness,
    ];

    if (this.song.isPlaying()) {
      this.canvas.spectrogram.nodes.push(
        new SoundHistoryNode(songVolume, currentColor)
      );
    } else {
      this.canvas.spectrogram.nodes.push({
        volume: this.sound.maxVolume / 2,
        color: [0, 0, 0],
      });
    }
    if (this.canvas.background.redraw) {
      this.canvas.background.draw(
        this.canvas.spectrogram.nodes,
        this.canvas.height
      );
    }
    if (this.canvas.spectrogram.enabled) {
      this.canvas.spectrogram.draw(this.sound.maxVolume, this.canvas.colorHue);
    }
    //remove the oldest soundHistoryNode from spectrogram
    this.canvas.spectrogram.nodes.splice(0, 1);
    if (this.canvas.fractal.enabled) {
      this.canvas.fractal.draw(
        this.canvas.totalEnergy,
        this.sound.currentVolume,
        this.canvas.colorHue,
        this.htmlHelper.sliderList.sliders.volumeSlider.maxValue,
        this.canvas.width,
        this.canvas.height
      );
    }
    if (this.canvas.frameRateDisplay.enabled) {
      this.canvas.frameRateDisplay.draw(this.canvas.height);
    }
  },
  initSongElements: function () {
    this.htmlHelper.buttonList.buttons.songButton = createButton("Play");
    this.htmlHelper.buttonList.buttons.songButton.mousePressed(
      this.song.toggleSongPlayback
    );
    this.htmlHelper.buttonList.buttonListDiv.child(
      this.buttonList.buttons.songButton
    );
    this.htmlHelper.buttonList.buttons.muteButton = createButton("Mute");
    this.htmlHelper.buttonList.buttons.muteButton.mousePressed(
      this.song.toggleMute
    );
    this.htmlHelper.buttonList.buttonListDiv.child(
      this.htmlHelper.buttonList.buttons.muteButton
    );
    //sliders
    this.htmlHelper.sliderList.sliders.songPositionSlider = createSlider(
      0,
      this.song.duration(),
      0,
      1
    );
    this.htmlHelper.sliderList.sliders.songPositionSlider.style(
      "width",
      this.canvas.width + "px"
    );
    this.htmlHelper.sliderList.sliderListDiv.child(
      this.htmlHelper.sliderList.sliders.songPositionSlider
    );

    this.sound.loadCurrentVolume();
    this.htmlHelper.sliderList.sliders.volumeSlider = createSlider(
      0,
      this.htmlHelper.sliderList.sliders.volumeSlider.maxValue,
      this.sound.currentVolume,
      1
    );
    this.htmlHelper.sliderList.sliders.volumeSlider.style(
      "width",
      this.canvas.width + "px"
    );
    this.htmlHelper.sliderList.sliders.volumeSlider.mouseReleased(
      this.sound.saveCurrentVolume
    );
    this.htmlHelper.sliderList.SliderListDiv.child(
      this.htmlHelper.sliderList.sliders.volumeSlider
    );
  },
  htmlHelper: {
    canvasDiv: {},
    interactivityDiv: {}, //div to hold buttons, sliders, etc.
    buttonList: {
      buttonListDiv: {},
      buttons: {
        frameRateButton: {},
        songButton: {},
        muteButton: {},
      },
    },
    sliderList: {
      sliderListDiv: {},
      sliders: {
        songPositionSlider: {},
        volumeSlider: {
          maxValue: 100,
        },
      },
    },
    init: function (toggleFRFunction) {
      this.canvasDiv = createDiv();
      this.interactivityDiv = createDiv();
      this.buttonList.buttonListDiv = createDiv();
      this.sliderList.sliderListDiv = createDiv();
      this.buttonList.buttons.frameRateButton = createButton("FR");
      this.canvasDiv.class("mediaPlayer"); //set the html class
      this.canvasDiv.child(this.canvas);
      this.interactivityDiv.class("interactivity");
      this.interactivityDiv.child(this.buttonList.buttonListDiv);
      this.interactivityDiv.child(this.sliderList.sliderListDiv);
      this.buttonList.buttonListDiv.class("buttonList");
      this.buttonList.buttonListDiv.child(
        this.buttonList.buttons.frameRateButton
      );
      this.buttonList.buttons.frameRateButton.mousePressed(toggleFRFunction);
      this.sliderList.sliderListDiv.class("sliderList");
    },
  },
  sound: {
    amp: new p5.Amplitude(),
    fft: new p5.FFT(0.9, 128),
    maxVolume: 1,
    currentVolume: 1,
    saveCurrentVolume: function () {
      storeItem(
        "currentVolume",
        this.htmlHelper.sliderList.sliders.volumeSlider.value()
      );
    },
    loadCurrentVolume: function () {
      this.sound.currentVolume = getItem("currentVolume");
      if (this.sound.currentVolume === null) {
        this.sound.currentVolume = songMaxVolume;
      }
    },
  },
  song: {
    isLoaded: false,
    isLoadSuccess: true,
    isLoading: false,
    isMuted: false,
    duration: 0,
    position: 0,
    positionAutoUpdate: true,
    skipRate: 10, //number of seconds to skip forward or back,
    load: function (setVisualElementsVisible) {
      this.isLoading = true;
      setVisualElementsVisible(false);
    },
    loaded: function (initSongElements, setVisualElementsVisible) {
      initSongElements();
      this.song.isLoaded = true;
      this.song.isLoading = false;
      setVisualElementsVisible(true);
    },
    loadFailed: function (setVisualElementsVisible) {
      this.song.isLoadSuccess = false;
      this.song.isLoading = false;
      setVisualElementsVisible(false);
    },
    ended: function () {
      this.htmlHelper.buttonList.buttons.songButton.html("Play");
    },
    togglePlayback: function () {
      if (this.song.isLoading || !this.song.isLoadSuccess) {
        return;
      }
      if (this.song.isPlaying()) {
        this.htmlHelper.buttonList.buttons.songButton.html("Play");
        this.song.position = this.song.currentTime();
        this.song.pause();
      } else {
        this.htmlHelper.buttonList.buttons.songButton.html("Pause");
        this.song.play();
        if (this.song.isMuted) {
          this.song.setVolume(0);
        } else {
          this.song.setVolume(
            this.sound.currentVolume /
              this.htmlHelper.sliderList.sliders.volumeSlider.maxValue
          );
        }
        this.song.OnEnded(this.song.songEnded);
      }
    },
    toggleMute: function () {
      if (isSongMuted) {
        htmlHelper.volumeSlider.value(currentVolume);
        song.setVolume(currentVolume / htmlHelper.volumeSliderMax);
        htmlHelper.muteButton.html("Mute");
      } else {
        htmlHelper.volumeSlider.value(0);
        song.setVolume(0);
        htmlHelper.muteButton.html("Unmute");
      }

      isSongMuted = !isSongMuted;
    },
  },
  canvas: {
    height: 660,
    width: 660,
    lowEnergy: {},
    highEnergy: {},
    totalEnergy: {},
    colorHue: {},
    colorSaturation: {},
    colorBrightness: {},
    background: {
      redraw: false, //when false, previous frames aren't overwritten. Set to true for 'colorful' bg.
      reset: function () {
        background(0, 0, 0);
      },
      draw: function (spectrogram, height) {
        for (let i = 0; i < spectrogram.length; i++) {
          stroke(spectrogram[i].col);
          line(i, 0, i, this.canvas.height);
        }
      },
    },
    spectrogram: {
      enabled: true,
      nodes: [],
      draw: function (maxVolume, colorHue) {
        noFill();
        beginShape();
        for (let i = 0; i < this.nodes.length; i++) {
          let y = map(
            this.nodes[i].volume,
            0,
            maxVolume,
            height * 0.6,
            height * 0.4
          );
          let oppositeHue = colorHue + 50;
          if (oppositeHue > 99) {
            oppositeHue %= 100;
          }
          stroke(oppositeHue, 100, 100);
          vertex(i, y);
        }
        endShape();
      },
    },
    fractal: {
      enabled: true,
      angleHistory: [],
      angleHistoryCount: 3, //determines the smoothness of the fractal movement
      heightDivider: 8, //determines starting heights of fractals relative to window height
      rotateOffset: 0,
      resolution: 0,
      colorResolution: 0,
      draw: function (
        totalEnergy,
        currentVolume,
        colorHue,
        volumeSliderMax,
        canvasWidth,
        canvasHeight
      ) {
        //TODO: find a way to normalize totalEnergy
        this.resolution = map(totalEnergy, 0, 100, 16, 10); //more energy => finer resolution
        this.colorResolution = map(totalEnergy, 0, 255, 0, 50);
        //average the current fractal angle with previous angles for a smoother transition
        let currentFractalAngle = map(
          currentVolume,
          0,
          currentVolume / volumeSliderMax,
          0,
          PI
        );
        this.angleHistory.push(currentFractalAngle);
        let fractalAngleAvg = 0;
        for (let i = 0; i < this.angleHistory.length; i++) {
          fractalAngleAvg += this.angleHistory[i];
        }
        fractalAngleAvg /= this.angleHistory.length;
        this.angleHistory.splice(0, 1);
        //draw the fractals
        //TODO: draw both fractals at once for better performance
        stroke(colorHue, 100, 100);
        //bottom fractal
        push();
        translate(canvasWidth / 2, canvasHeight);
        this.drawBranch(width / this.heightDivider, fractalAngleAvg, colorHue);
        pop();
        //top fractal
        push();
        translate(width / 2, 0);
        scale(1, -1);
        this.drawBranch(
          canvasWidth / this.heightDivider,
          fractalAngleAvg,
          colorHue
        );
        pop();
      },
      //  drawBranch() is a Recursive function used to draw fractals
      //  len: branch length
      //  fractalAngle: angle between child branches
      //  fractalResolution: branch length pixel count used to break out of the recursion
      //  branchColor: the branches color
      //  colorResolution: the offset around the color wheel that the child branch will have relative to its parent
      drawBranch: function (len, fractalAngle, branchColor) {
        //draw the branch
        stroke(branchColor, 100, 100);
        line(0, 0, 0, -len);
        //Offset the child branch a certain amount around the color wheel
        branchColor += this.colorResolution;
        if (branchColor > 99) {
          branchColor %= 100;
        }
        //if the current branch length isn't too small, continue recursing
        if (len > this.resolution) {
          translate(0, -len);
          //right branch
          push();
          rotate(fractalAngle);
          this.drawBranch(len * 0.67, fractalAngle, branchColor);
          pop();
          //left branch
          push();
          rotate(-fractalAngle);
          this.drawBranch(len * 0.67, fractalAngle, branchColor);
          pop();
        }
      },
    },
    frameRateDisplay: {
      enabled: true,
      history: new Array(20).fill(1),
      toggle: function () {
        this.canvas.frameRateDisplay.enabled = !this.canvas.frameRateDisplay
          .enabled;
      },
      draw: function (canvasHeight) {
        this.history.push(frameRate());
        let avgFr = 0;
        for (let i = 0; i < this.history.length; i++) {
          avgFr += this.history[i];
        }
        avgFr /= this.history.length;
        textAlign(LEFT);
        fill(100, 0, 100);
        stroke(0, 100, 0);
        textSize(12);
        text("FPS: " + avgFr.toFixed(2), 10, canvasHeight - 10);
        this.history.splice(0, 1);
      },
    },
    printMessage: function (message) {
      background(0, 0, 0);
      stroke(0, 0, 100);
      fill(0, 0, 100);
      textSize(60);
      textAlign(CENTER, CENTER);
      text(message, width / 2, height / 2);
    },
    setVisualElementsVisible(visible) {
      this.background.enabled = visible;
      this.spectrogram.enabled = visible;
      this.fractal.enabled = visible;
    },
  },
  interactivity: {
    //This method exists to mitigate bugs caused by the jump() function
    //Shoutout to joepdooper on this thread for finding this solution:
    //https://github.com/processing/p5.js-sound/issues/372
    preJump: function () {
      setTimeout(function () {
        Object.assign(this.song, { _playing: true });
        this.song.playMode("restart");
      }, 100);
      this.song.stop();
      this.song.playMode("sustain");
    },
    keyPressed: function () {
      let jumpToTime = 0;
      switch (keyCode) {
        case LEFT_ARROW:
          jumpToTime = this.song.currentTime() - numJumpSeconds;
          if (jumpToTime > 0) {
            preJump();
            this.song.jump(jumpToTime);
          } else {
            preJump();
            this.song.jump(0);
          }
          checkKonamiCode("LEFT");
          break;
        case RIGHT_ARROW:
          jumpToTime = this.song.currentTime() + numJumpSeconds;
          if (jumpToTime < this.song.duration()) {
            preJump();
            this.song.jump(jumpToTime);
          } else {
            this.song.stop();
          }
          this.interactivity.konami.checkKonamiCode("RIGHT");
          break;
        case UP_ARROW:
          this.interactivity.konami.checkKonamiCode("UP");
          break;
        case DOWN_ARROW:
          this.interactivity.konami.checkKonamiCode("DOWN");
          break;
        case 65: //a
          this.interactivity.konami.checkKonamiCode("A");
          break;
        case 66: //b
          this.interactivity.konami.checkKonamiCode("B");
          break;
        case 32: //spacebar
          this.interactivity.konami.toggleSongPlayback();
          break;
        default:
          this.interactivity.konami.checkKonamiCode("");
          break;
      }
      return false; //prevent any default window behaviour
    },
    konami: {
      code: new Array(10).fill(""),
      checkKonamiCode: function (input) {
        this.interactivity.konami.code.push(input);
        this.interactivity.konami.code.splice(0, 1);
        if (input !== "A") {
          return;
        }
        if (
          this.interactivity.konami.code[0] === "UP" &&
          this.interactivity.konami.code[1] === "UP" &&
          this.interactivity.konami.code[2] === "DOWN" &&
          this.interactivity.konami.code[3] === "DOWN" &&
          this.interactivity.konami.code[4] === "LEFT" &&
          this.interactivity.konami.code[5] === "RIGHT" &&
          this.interactivity.konami.code[6] === "LEFT" &&
          this.interactivity.konami.code[7] === "RIGHT" &&
          this.interactivity.konami.code[8] === "B" &&
          this.interactivity.konami.code[9] === "A"
        ) {
          this.canvas.background.redraw = !this.canvas.background.redraw;
          this.canvas.background.reset();
        }
      },
    },
  },
};

//setup() called just before draw()
function setup() {
  beatbox.htmlHelper.init(beatbox.canvas.frameRateDisplay.toggle);
  beatbox.song = loadSound(
    "sounds/Sunrise.mp3",
    beatbox.initSongElements,
    beatbox.canvas.setVisualElementsVisible(false),
    beatbox.canvas.setVisualElementsVisible(false)
  );
  let canvas = createCanvas(beatbox.canvas.width, beatbox.canvas.height);
  canvas.mousePressed(beatbox.song.togglePlayback);
  colorMode(HSB, 100);
  beatbox.canvas.spectrogram.nodes = new Array(this.width).fill({
    volume: beatbox.sound.maxVolume / 2,
    color: [0, 0, 0],
  });
  beatbox.canvas.fractal.angleHistory = new Array(
    beatbox.canvas.fractal.angleHistoryCount
  ).fill(0);
}
//draw() is called repeatedly. It defaults at 60fps but adjusts automatically based on CPU load
function draw() {
  beatbox.draw();
}
