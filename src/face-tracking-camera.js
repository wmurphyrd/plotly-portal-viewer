import MovingAverage from './moving-average.js'
import { Matrix4 } from 'three/src/math/Matrix4'
import { Quaternion } from 'three/src/math/Quaternion'
import { Vector3 } from 'three/src/math/Vector3'

class FaceTrackingCamera {
  constructor (plotEl, videoEl, cameraSettings, trackerSettings, debugCanvas) {
    if (!plotEl || !plotEl.layout) {
      throw new Error('FaceTrackingCamera requires a rendered plotly element')
    }

    this.cameraSettings = cameraSettings || {}
    this.cameraSettings.range = this.cameraSettings.range || { x: 3, y: 3, z: 3 }
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

    this.faceCenter = { x: 0, y: 0 }

    this.mat = new Matrix4()
    this.vec = new Vector3()
    this.target = new Vector3()
    this.quat = new Quaternion()
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
  handleClick (plot, event) {
    const btn = event.currentTarget
    if (this.isTracking) {
      this.stopTracking()
      btn.classList.remove('cl-face-tracking-active')
      btn.querySelector('path').style.fill = ''
    } else {
      this.startTracking()
      btn.classList.add('cl-face-tracking-active')
      btn.querySelector('path').style.fill = 'rgba(68, 68, 68, 0.7)'
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
    const camPosition = this.plotEl._fullLayout.scene.camera.eye
    const centerPosition = this.plotEl._fullLayout.scene.camera.center
    const up = this.plotEl._fullLayout.scene.camera.up
    const eyeStart = this.cameraSettings.eyeStart
    const faceCenter = this.faceCenter
    const range = this.cameraSettings.range

    faceCenter.x = (face.x + face.width / 2) / webcam.width
    faceCenter.y = (face.y + face.height / 2) / webcam.height
    const x = this.x.push(now, faceCenter.x)
    const z = this.z.push(now, faceCenter.y)
    this.target.copy(eyeStart)
    this.mat.lookAt(this.target, centerPosition, up)
    this.quat.setFromRotationMatrix(this.mat)
    this.vec.set(1, 0, 0)
    this.vec.applyQuaternion(this.quat)
    this.vec.multiplyScalar(-x * range.x + range.x / 2)
    this.target.add(this.vec)
    // applying z translation along y axis due to plotly using z as up
    this.vec.set(0, 1, 0)
    this.vec.applyQuaternion(this.quat)
    this.vec.multiplyScalar(eyeStart.z - z * range.z + range.z / 2)
    this.target.add(this.vec)
    camPosition.x = this.target.x
    camPosition.z = this.target.z
    camPosition.y = this.target.y
    this.timeOfLastUpdate = now
    window.Plotly.relayout('myDiv', 'scene.camera.eye', camPosition)
  }

  startTracking () {
    const decay = this.cameraSettings.smoothingDecay
    this.x = MovingAverage(decay)
    this.z = MovingAverage(decay)

    const camStart = this.plotEl._fullLayout.scene.camera
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
export default FaceTrackingCamera
