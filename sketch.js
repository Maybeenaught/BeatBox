var beatbox = {
  setup: function () {
    beatbox.canvas.setup()
    beatbox.htmlHelper.setup()
    beatbox.song.setup()
  },
  draw: function () {
    if (beatbox.canvas.background.redraw) { beatbox.canvas.background.reset() }
    if (beatbox.song.isLoaded) {
      if (beatbox.song.positionAutoUpdate) {
        if (beatbox.song.p5Song.isPlaying()) { beatbox.htmlHelper.sliderList.sliders.songPositionSlider.value(beatbox.song.p5Song.currentTime()) }
        else { beatbox.htmlHelper.sliderList.sliders.songPositionSlider.value(beatbox.song.position) }
      }
      if (beatbox.song.p5Song.isPlaying() && !beatbox.song.isMuted) {
        beatbox.sound.currentVolume = beatbox.htmlHelper.sliderList.sliders.volumeSlider.sliderObject.value()
        beatbox.song.p5Song.setVolume(
          beatbox.htmlHelper.sliderList.sliders.volumeSlider.sliderObject.value() /
          beatbox.htmlHelper.sliderList.sliders.volumeSlider.maxValue
        )
      }
      else if (beatbox.song.isMuted && beatbox.htmlHelper.sliderList.sliders.volumeSlider.sliderObject.value() != 0) { beatbox.song.toggleMute() }
    }
    else if (beatbox.song.isLoading) { printMessage("Loading...") }
    else if (!beatbox.song.isLoadSuccess) { printMessage("Song failed to load") }

    beatbox.sound.fft.analyze()
    let songVolume = beatbox.sound.amp.getLevel()
    beatbox.canvas.lowEnergy = beatbox.sound.fft.getEnergy(40, 180)
    beatbox.canvas.highEnergy = beatbox.sound.fft.getEnergy(10000, 15000)
    beatbox.canvas.totalEnergy = beatbox.sound.fft.getEnergy(40, 15000)

    //set color variables from vol and freq info
    beatbox.canvas.colorHue = map(beatbox.canvas.highEnergy, 0, 100, 0, 100)
    beatbox.canvas.colorSaturation = map(beatbox.canvas.lowEnergy, 0, 255, 50, 100)
    beatbox.canvas.colorBrightness = map(beatbox.canvas.totalEnergy, 0, 255, 0, 100)
    let currentColor = [beatbox.canvas.colorHue, beatbox.canvas.colorSaturation, beatbox.canvas.colorBrightness]

    if (beatbox.song.p5Song.isPlaying()) {
      beatbox.canvas.spectrogram.nodes.push({
        volume: songVolume,
        color: currentColor,
      })
    }
    else {
      beatbox.canvas.spectrogram.nodes.push({
        volume: beatbox.sound.maxVolume / 2,
        color: [0, 0, 0],
      })
    }

    if (beatbox.canvas.background.redraw) { beatbox.canvas.background.draw(beatbox.canvas.spectrogram.nodes, beatbox.canvas.height) }
    if (beatbox.canvas.fractal.enabled) { beatbox.canvas.fractal.draw() }
    if (beatbox.canvas.frameRateDisplay.enabled) { beatbox.canvas.frameRateDisplay.draw(beatbox.canvas.height) }
    if (beatbox.canvas.spectrogram.enabled) { beatbox.canvas.spectrogram.draw(beatbox.sound.maxVolume, beatbox.canvas.colorHue) }
    //remove the oldest soundHistoryNode from spectrogram
    beatbox.canvas.spectrogram.nodes.splice(0, 1)
  },
  initSongElements: function () {
    beatbox.htmlHelper.buttonList.buttons.songButton = createButton("Play")
    beatbox.htmlHelper.buttonList.buttons.songButton.mousePressed(beatbox.song.togglePlayback)
    beatbox.htmlHelper.buttonList.buttonListDiv.child(beatbox.htmlHelper.buttonList.buttons.songButton)

    beatbox.htmlHelper.buttonList.buttons.muteButton = createButton("Mute")
    beatbox.htmlHelper.buttonList.buttons.muteButton.mousePressed(beatbox.song.toggleMute)
    beatbox.htmlHelper.buttonList.buttonListDiv.child(beatbox.htmlHelper.buttonList.buttons.muteButton)

    beatbox.htmlHelper.sliderList.sliders.songPositionSlider = createSlider(0, beatbox.song.p5Song.duration(), 0, 1)
    beatbox.htmlHelper.sliderList.sliders.songPositionSlider.style("width", beatbox.canvas.width + "px")
    beatbox.htmlHelper.sliderList.sliderListDiv.child(beatbox.htmlHelper.sliderList.sliders.songPositionSlider)

    beatbox.sound.loadCurrentVolume()
    beatbox.htmlHelper.sliderList.sliders.volumeSlider.sliderObject = createSlider(0, beatbox.htmlHelper.sliderList.sliders.volumeSlider.maxValue, beatbox.sound.currentVolume, 1)
    beatbox.htmlHelper.sliderList.sliders.volumeSlider.sliderObject.style("width", beatbox.canvas.width + "px")
    beatbox.htmlHelper.sliderList.sliders.volumeSlider.sliderObject.mouseReleased(beatbox.sound.saveCurrentVolume)
    beatbox.htmlHelper.sliderList.sliderListDiv.child(beatbox.htmlHelper.sliderList.sliders.volumeSlider.sliderObject)
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
          sliderObject: {},
          maxValue: 100,
        },
      },
    },
    setup: function () {
      beatbox.htmlHelper.canvasDiv = createDiv()
      beatbox.htmlHelper.interactivityDiv = createDiv()
      beatbox.htmlHelper.buttonList.buttonListDiv = createDiv()
      beatbox.htmlHelper.sliderList.sliderListDiv = createDiv()
      beatbox.htmlHelper.buttonList.buttons.frameRateButton = createButton("FR")
      beatbox.htmlHelper.canvasDiv.class("mediaPlayer") //set the html class
      beatbox.htmlHelper.canvasDiv.child(beatbox.canvas.p5Canvas)
      beatbox.htmlHelper.interactivityDiv.class("interactivity")
      beatbox.htmlHelper.interactivityDiv.child(beatbox.htmlHelper.buttonList.buttonListDiv)
      beatbox.htmlHelper.interactivityDiv.child(beatbox.htmlHelper.sliderList.sliderListDiv)
      beatbox.htmlHelper.buttonList.buttonListDiv.class("buttonList")
      beatbox.htmlHelper.buttonList.buttonListDiv.child(beatbox.htmlHelper.buttonList.buttons.frameRateButton)
      beatbox.htmlHelper.buttonList.buttons.frameRateButton.mousePressed(beatbox.canvas.frameRateDisplay.toggle)
      beatbox.htmlHelper.sliderList.sliderListDiv.class("sliderList")
    },
  },
  sound: {
    amp: new p5.Amplitude(),
    fft: new p5.FFT(0.9, 128),
    maxVolume: 1,
    currentVolume: 1,
    saveCurrentVolume: function () { storeItem("currentVolume", beatbox.htmlHelper.sliderList.sliders.volumeSlider.sliderObject.value()) },
    loadCurrentVolume: function () {
      beatbox.sound.currentVolume = getItem("currentVolume")
      if (beatbox.sound.currentVolume === null) { beatbox.sound.currentVolume = beatbox.sound.maxVolume }
    },
  },
  song: {
    p5Song: {},
    isLoaded: false,
    isLoadSuccess: true,
    isLoading: false,
    isMuted: false,
    duration: 0,
    position: 0,
    positionAutoUpdate: true,
    skipRate: 10, //number of seconds to skip forward or back,
    setup: function () { beatbox.song.p5Song = loadSound("sounds/Sunrise.mp3", beatbox.song.loaded) },
    load: function () { beatbox.song.isLoading = true },
    loaded: function () {
      beatbox.song.isLoaded = true
      beatbox.song.isLoading = false
      beatbox.song.duration = beatbox.song.p5Song.duration()
      beatbox.initSongElements()
      beatbox.canvas.setVisualElementsVisible(true)
    },
    loadFailed: function () {
      beatbox.song.isLoadSuccess = false
      beatbox.song.isLoading = false
    },
    ended: function () { beatbox.htmlHelper.buttonList.buttons.songButton.html("Play") },
    togglePlayback: function () {
      if (beatbox.song.isLoading || !beatbox.song.isLoadSuccess) { return }
      if (beatbox.song.p5Song.isPlaying()) {
        beatbox.htmlHelper.buttonList.buttons.songButton.html("Play")
        beatbox.song.position = beatbox.song.p5Song.currentTime()
        beatbox.song.p5Song.pause()
      }
      else {
        beatbox.htmlHelper.buttonList.buttons.songButton.html("Pause")
        beatbox.song.p5Song.play()
        if (beatbox.song.isMuted) { beatbox.song.p5Song.setVolume(0) }
        else { beatbox.song.p5Song.setVolume(beatbox.sound.currentVolume / beatbox.htmlHelper.sliderList.sliders.volumeSlider.maxValue) }
        beatbox.song.p5Song.onended(beatbox.song.ended)
      }
    },
    toggleMute: function () {
      if (beatbox.song.isMuted) {
        beatbox.htmlHelper.sliderList.sliders.volumeSlider.sliderObject.value(beatbox.sound.currentVolume)
        beatbox.song.p5Song.setVolume(beatbox.sound.currentVolume / beatbox.htmlHelper.sliderList.sliders.volumeSlider.maxValue)
        beatbox.htmlHelper.buttonList.buttons.muteButton.html("Mute")
      }
      else {
        beatbox.htmlHelper.sliderList.sliders.volumeSlider.sliderObject.value(0)
        beatbox.song.p5Song.setVolume(0)
        beatbox.htmlHelper.buttonList.buttons.muteButton.html("Unmute")
      }
      beatbox.song.isMuted = !beatbox.song.isMuted
    },
  },
  canvas: {
    height: 660,
    width: 660,
    p5Canvas: {},
    lowEnergy: {},
    highEnergy: {},
    totalEnergy: {},
    colorHue: {},
    colorSaturation: {},
    colorBrightness: {},
    background: {
      redraw: true, //when false, previous frames aren't overwritten. Set to true for 'colorful' bg.
      reset: function () { background(0, 0, 0) },
      draw: function (spectrogram, height) {
        for (let i = 0; i < spectrogram.length; i++) {
          stroke(spectrogram[i].color)
          line(i, 0, i, beatbox.canvas.height)
        }
      },
    },
    spectrogram: {
      enabled: true,
      nodes: [],
      draw: function (maxVolume, colorHue) {
        noFill()
        beginShape()
        for (let i = 0; i < beatbox.canvas.spectrogram.nodes.length; i++) {
          let y = map(beatbox.canvas.spectrogram.nodes[i].volume, 0, maxVolume, height * 0.6, height * 0.4)
          let oppositeHue = colorHue + 50
          if (oppositeHue > 99) { oppositeHue %= 100 }
          stroke(oppositeHue, 100, 100)
          vertex(i, y)
        }
        endShape()
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
      draw: function () {
        //TODO: find a way to normalize totalEnergy
        beatbox.canvas.fractal.resolution = map(beatbox.canvas.totalEnergy, 0, 100, 16, 10) //more energy => finer resolution
        beatbox.canvas.fractal.colorResolution = map(beatbox.canvas.totalEnergy, 0, 255, 0, 50)
        //average the current fractal angle with previous angles for a smoother transition
        let currentFractalAngle = map(beatbox.sound.amp.getLevel(), 0, beatbox.sound.currentVolume / beatbox.htmlHelper.sliderList.sliders.volumeSlider.maxValue, 0, PI)
        beatbox.canvas.fractal.angleHistory.push(currentFractalAngle)
        let fractalAngleAvg = 0
        for (let i = 0; i < beatbox.canvas.fractal.angleHistory.length; i++) { fractalAngleAvg += beatbox.canvas.fractal.angleHistory[i] }
        fractalAngleAvg /= beatbox.canvas.fractal.angleHistory.length
        beatbox.canvas.fractal.angleHistory.splice(0, 1)

        //draw the fractals
        //TODO: draw both fractals at once for better performance
        stroke(beatbox.canvas.colorHue, 100, 100)

        //bottom fractal
        push()
        translate(beatbox.canvas.width / 2, beatbox.canvas.height)
        beatbox.canvas.fractal.drawBranch(beatbox.canvas.width / beatbox.canvas.fractal.heightDivider, fractalAngleAvg, beatbox.canvas.colorHue)
        pop()

        //top fractal
        push()
        translate(width / 2, 0)
        scale(1, -1)
        beatbox.canvas.fractal.drawBranch(beatbox.canvas.width / beatbox.canvas.fractal.heightDivider, fractalAngleAvg, beatbox.canvas.colorHue)
        pop()
      },
      drawBranch: function (len, fractalAngle, branchColor) {
        //draw the branch
        stroke(branchColor, 100, 100)
        line(0, 0, 0, -len)
        //Offset the child branch a certain amount around the color wheel
        branchColor += beatbox.canvas.fractal.colorResolution
        if (branchColor > 99) { branchColor %= 100 }
        //if the current branch length isn't too small, continue recursing
        if (len > beatbox.canvas.fractal.resolution) {
          translate(0, -len)

          //right branch
          push()
          rotate(fractalAngle)
          beatbox.canvas.fractal.drawBranch(len * 0.67, fractalAngle, branchColor)
          pop()

          //left branch
          push()
          rotate(-fractalAngle)
          beatbox.canvas.fractal.drawBranch(len * 0.67, fractalAngle, branchColor)
          pop()
        }
      },
    },
    frameRateDisplay: {
      enabled: true,
      history: new Array(20).fill(1),
      toggle: function () { beatbox.canvas.frameRateDisplay.enabled = !beatbox.canvas.frameRateDisplay.enabled },
      draw: function (canvasHeight) {
        beatbox.canvas.frameRateDisplay.history.push(frameRate())
        let avgFr = 0
        for (let i = 0; i < beatbox.canvas.frameRateDisplay.history.length; i++) { avgFr += beatbox.canvas.frameRateDisplay.history[i] }
        avgFr /= beatbox.canvas.frameRateDisplay.history.length
        textAlign(LEFT)
        fill(100, 0, 100)
        stroke(0, 100, 0)
        textSize(12)
        text("FPS: " + avgFr.toFixed(2), 10, canvasHeight - 10)
        beatbox.canvas.frameRateDisplay.history.splice(0, 1)
      },
    },
    setup: function () {
      beatbox.canvas.p5Canvas = createCanvas(beatbox.canvas.width, beatbox.canvas.height)
      beatbox.canvas.p5Canvas.mousePressed(beatbox.song.togglePlayback)
      colorMode(HSB, 100)
      beatbox.canvas.spectrogram.nodes = new Array(beatbox.canvas.width).fill({
        volume: beatbox.sound.maxVolume / 2,
        color: [0, 0, 0],
      })
      beatbox.canvas.fractal.angleHistory = new Array(beatbox.canvas.fractal.angleHistoryCount).fill(0)
    },
    printMessage: function (message) {
      background(0, 0, 0)
      stroke(0, 0, 100)
      fill(0, 0, 100)
      textSize(60)
      textAlign(CENTER, CENTER)
      text(message, width / 2, height / 2)
    },
    setVisualElementsVisible(visible) {
      beatbox.canvas.background.enabled = visible
      beatbox.canvas.spectrogram.enabled = visible
      beatbox.canvas.fractal.enabled = visible
    },
  },
  interactivity: {
    timeSkipLength: 10,
    //This method exists to mitigate bugs caused by the jump() function
    //Shoutout to joepdooper on this thread for finding this solution:
    //https://github.com/processing/p5.js-sound/issues/372
    preJump: function () {
      setTimeout(function () {
        Object.assign(beatbox.song.p5Song, { _playing: true })
        beatbox.song.p5Song.playMode("restart")
      }, 100)
      beatbox.song.p5Song.stop()
      beatbox.song.p5Song.playMode("sustain")
    },
    keyPressed: function () {
      let jumpToTime = 0
      switch (keyCode) {
        case LEFT_ARROW:
          jumpToTime = beatbox.song.p5Song.currentTime() - beatbox.interactivity.timeSkipLength
          if (jumpToTime > 0) {
            beatbox.interactivity.preJump()
            beatbox.song.p5Song.jump(jumpToTime)
          }
          else {
            beatbox.interactivity.preJump()
            beatbox.song.p5Song.jump(0)
          }
          beatbox.interactivity.konami.checkKonamiCode("LEFT")
          break
        case RIGHT_ARROW:
          jumpToTime = beatbox.song.p5Song.currentTime() + beatbox.interactivity.timeSkipLength
          if (jumpToTime < beatbox.song.duration) {
            beatbox.interactivity.preJump()
            beatbox.song.p5Song.jump(jumpToTime)
          }
          else { beatbox.song.p5Song.stop() }
          beatbox.interactivity.konami.checkKonamiCode("RIGHT")
          break
        case UP_ARROW:
          beatbox.interactivity.konami.checkKonamiCode("UP")
          break
        case DOWN_ARROW:
          beatbox.interactivity.konami.checkKonamiCode("DOWN")
          break
        case 65: //a
          beatbox.interactivity.konami.checkKonamiCode("A")
          break
        case 66: //b
          beatbox.interactivity.konami.checkKonamiCode("B")
          break
        case 32: //spacebar
          beatbox.song.togglePlayback()
          break
        default:
          beatbox.interactivity.konami.checkKonamiCode("")
          break
      }
      return false //prevent any default window behaviour
    },
    konami: {
      code: new Array(10).fill(""),
      checkKonamiCode: function (input) {
        beatbox.interactivity.konami.code.push(input)
        beatbox.interactivity.konami.code.splice(0, 1)
        if (input !== "A") { return }
        if (
          beatbox.interactivity.konami.code[0] === "UP" &&
          beatbox.interactivity.konami.code[1] === "UP" &&
          beatbox.interactivity.konami.code[2] === "DOWN" &&
          beatbox.interactivity.konami.code[3] === "DOWN" &&
          beatbox.interactivity.konami.code[4] === "LEFT" &&
          beatbox.interactivity.konami.code[5] === "RIGHT" &&
          beatbox.interactivity.konami.code[6] === "LEFT" &&
          beatbox.interactivity.konami.code[7] === "RIGHT" &&
          beatbox.interactivity.konami.code[8] === "B" &&
          beatbox.interactivity.konami.code[9] === "A"
        ) {
          beatbox.canvas.background.redraw = !beatbox.canvas.background.redraw
          beatbox.canvas.background.reset()
        }
      },
    },
  },
}

function setup() { beatbox.setup() }
function draw() { beatbox.draw() }
function keyPressed() { beatbox.interactivity.keyPressed() }
