const MovingAverage = require('./moving-average.js')
module.exports = class FaceTrackingCamera {
  constructor (plotEl, videoEl, cameraSettings, trackerSettings, debugCanvas) {
    if (!plotEl || !plotEl.layout) {
      throw new Error('FaceTrackingCamera requires a rendered plotly element')
    }

    this.cameraSettings = cameraSettings || {}
    this.cameraSettings.range = this.cameraSettings.range || { x: 2, y: 2, z: 2 }
    this.cameraSettings.smoothingDecay = this.cameraSettings.smoothingDecay || 300
    this.cameraSettings.forecastStart = this.cameraSettings.forecastStart || 22
    this.cameraSettings.forecastEnd = this.cameraSettings.forecastEnd || 500

    this.trackerSettings = trackerSettings || {}
    this.trackerSettings.trackerInitialScale = this.trackerSettings.trackerInitialScale || 2.5
    this.trackerSettings.trackerStepSize = this.trackerSettings.trackerStepSize || 1
    this.trackerSettings.trackerEdgesDensity = this.trackerSettings.trackerEdgesDensity || 0.1

    this.videoEl = videoEl
    this.plotEl = plotEl

    if (debugCanvas) {
      this.canvas = debugCanvas
      this.context = this.canvas.getContext('2d')
    }

    this.center = { x: 0, y: 0 }
    this.plotUpdater = {
      scene: {
        camera: {
          eye: { x: 0, y: 0, z: 0 } // ,
          // center: {x: 0, y: 0, z: 0}
        }
      }
    }
    window.Plotly.react(plotEl, plotEl.data, plotEl.layout, {
      modeBarButtonsToAdd: [{
        name: 'Magic Portal View',
        icon: {
          width: 1000,
          height: 1000,
          path: 'M336 0H48C21.5 0 0 21.5 0 48v416c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48V48c0-26.5-21.5-48-48-48zM192 128c35.3 0 64 28.7 64 64s-28.7 64-64 64-64-28.7-64-64 28.7-64 64-64zm112 236.8c0 10.6-10 19.2-22.4 19.2H102.4C90 384 80 375.4 80 364.8v-19.2c0-31.8 30.1-57.6 67.2-57.6h5c12.3 5.1 25.7 8 39.8 8s27.6-2.9 39.8-8h5c37.1 0 67.2 25.8 67.2 57.6v19.2z',
          transform: 'matrix(1.9 0 0 1.75 0 100)'
        },
        click: this.handleClick.bind(this)
      }]
    })
  }
  handleClick (event) {
    if (this.isTracking) {
      this.stopTracking()
    } else {
      this.startTracking()
    }
  }

  onTracked (event) {
    // const object3D = this.el.object3D
    const webcam = this.videoEl
    var now = Date.now()
    if (this.canvas) {
      const context = this.context
      const canvas = this.canvas
      context.clearRect(0, 0, canvas.width, canvas.height)
      event.data.forEach(function (rect) {
        context.strokeStyle = '#a64ceb'
        context.strokeRect(rect.x, rect.y, rect.width, rect.height)
        context.font = '11px Helvetica'
        context.fillStyle = '#fff'
        context.fillText(
          'x: ' + rect.x + 'px',
          rect.x + rect.width + 5,
          rect.y + 11
        )
        context.fillText(
          'y: ' + rect.y + 'px',
          rect.x + rect.width + 5,
          rect.y + 22
        )
      })
    }
    const face = event.data[0]
    if (
      !face || !Number.isFinite(face.x + face.y + face.width + face.height)
    ) {
      return
    }
    const camPosition = this.plotEl.layout.scene.camera.eye
    // const centerPosition = this.plotUpdater.scene.camera.center
    // const centerStart = this.cameraSettings.centerStart
    const eyeStart = this.cameraSettings.eyeStart
    const center = this.center
    const range = this.cameraSettings.range

    center.x = (face.x + face.width / 2) / webcam.width
    center.y = (face.y + face.height / 2) / webcam.height
    const size = Math.sqrt(Math.pow(face.width / webcam.width, 2) + Math.pow(face.height / webcam.height, 2))
    const x = this.x.push(now, center.x)
    const z = this.z.push(now, center.y)
    const y = this.y.push(now, size)
    camPosition.x = eyeStart.x - x * range.x + range.x / 2
    camPosition.z = eyeStart.z - z * range.z + range.z / 2
    camPosition.y = eyeStart.y + y * range.y - range.y / 2
    // centerPosition.x = centerStart.x - x + 0.5
    // centerPosition.x = centerStart.x
    // centerPosition.z = centerStart.z - z + 0.5
    // centerPosition.z = centerStart.z
    // centerPosition.y = centerStart.y

    // camPosition.y = start.y
    // const zma = this.z.push(
    //   now,
    //   Math.sqrt(Math.pow(size.x, 2) + Math.pow(size.y, 2))
    // )
    // object3D.translateZ(-zma * this.data.range.z + this.halfRange.z)
    this.timeOfLastUpdate = now
    window.Plotly.relayout('myDiv', this.plotEl.layout)
  }

  startTracking () {
    const decay = this.cameraSettings.smoothingDecay
    this.x = MovingAverage(decay)
    // depth is jumpier, add extra smoothing
    this.y = MovingAverage(decay * 3)
    this.z = MovingAverage(decay)

    const camStart = this.plotEl.layout.scene.camera
    this.cameraSettings.eyeStart = { x: camStart.eye.x, y: camStart.eye.y, z: camStart.eye.z }
    this.cameraSettings.centerStart = { x: camStart.center.x, y: camStart.center.y, z: camStart.center.z }

    if (this.trackerTask) {
      this.trackerTask.run()
    } else {
      this.tracker = new window.tracking.ObjectTracker('face')
      this.tracker.setInitialScale(this.trackerSettings.trackerInitialScale)
      this.tracker.setStepSize(this.trackerSettings.trackerStepSize)
      this.tracker.setEdgesDensity(this.trackerSettings.trackerEdgesDensity)
      this.tracker.on('track', this.onTracked.bind(this))
      this.trackerTask = window.tracking.track(this.videoEl, this.tracker, { camera: true })
    }
    this.isTracking = true
    this.previousDragMode = this.plotEl.layout.scene.dragmode
    this.plotEl.layout.scene.dragmode = false
  }

  stopTracking () {
    this.isTracking = false
    if (this.trackerTask) {
      this.trackerTask.stop()
    }
    this.plotEl.layout.scene.dragmode = this.previousDragMode == null
      ? 'turntable'
      : this.previousDragMode
    window.Plotly.relayout(this.plotEl, this.plotEl.layout)
  }
}
