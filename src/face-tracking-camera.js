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
    const camStart = plotEl.layout.scene.camera
    this.cameraSettings.eyeStart = { x: camStart.eye.x, y: camStart.eye.y, z: camStart.eye.z }
    this.cameraSettings.centerStart = { x: camStart.center.x, y: camStart.center.y, z: camStart.center.z }

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
  }

  startTracking () {
    const decay = this.cameraSettings.smoothingDecay
    this.x = MovingAverage(decay)
    this.y = MovingAverage(decay * 10)
    this.z = MovingAverage(decay)

    this.tracker = new window.tracking.ObjectTracker('face')
    this.tracker.setInitialScale(this.trackerSettings.trackerInitialScale)
    this.tracker.setStepSize(this.trackerSettings.trackerStepSize)
    this.tracker.setEdgesDensity(this.trackerSettings.trackerEdgesDensity)
    window.tracking.track(this.videoEl, this.tracker, { camera: true })
    this.tracker.on('track', this.onTracked.bind(this))
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
    const camPosition = this.plotUpdater.scene.camera.eye
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
    window.Plotly.relayout('myDiv', this.plotUpdater)
  }
}
