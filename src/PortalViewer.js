import MovingAverage from './moving-average.js'
import StyleSheet from './dyss.js'
import { Matrix4 } from 'three/src/math/Matrix4'
import { Quaternion } from 'three/src/math/Quaternion'
import { Vector3 } from 'three/src/math/Vector3'

const sheet = new StyleSheet()
// css classes
const classVideoContainer = 'cl-face-tracking-video-container'
const classTrackingActive = 'cl-face-tracking-active'
const classModebarActive = 'cl-modebar-face-tracking-active'
const classVideoActive = 'cl-face-tracking-video-active'
const classTrackingBtnActive = 'cl-face-tracking-button-active'
const classVideoBtnActive = 'cl-face-tracking-video-button-active'

const activateButtonName = 'Portal View (Webcam Face Tracking)'
const passthroughBtnName = 'Show Webcam Tracking'
sheet.add(`.${classTrackingBtnActive} path, .${classVideoBtnActive} path`, {
  fill: 'rgba(68, 68, 68, 0.7) !important' // override plotly's id based selector
})
sheet.add(`a[data-title="${passthroughBtnName}"]`, {
  display: 'none'
})
sheet.add(`.${classModebarActive} a[data-title="${passthroughBtnName}"]`, {
  display: 'inline'
})
sheet.add(`.${classVideoContainer}`, {
  position: 'fixed',
  bottom: '0',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '320px',
  height: '240px',
  opacity: '0',
  pointerEvents: 'none'
})
sheet.add(`.${classVideoContainer}>*`, {
  position: 'absolute'
})
sheet.add(`.${classVideoContainer}.${classTrackingActive}.${classVideoActive}`, {
  opacity: '1',
  pointerEvents: 'auto'
})

class PortalViewer {
  constructor (cameraSettings, trackerSettings) {
    this.cameraSettings = cameraSettings || {}
    this.cameraSettings.range = this.cameraSettings.range || { x: 3, y: 3, z: 3 }
    this.cameraSettings.smoothingDecay = this.cameraSettings.smoothingDecay || 300
    this.cameraSettings.forecastStart = this.cameraSettings.forecastStart || 22
    this.cameraSettings.forecastEnd = this.cameraSettings.forecastEnd || 500

    this.trackerSettings = trackerSettings || {}
    this.trackerSettings.trackerInitialScale = this.trackerSettings.trackerInitialScale || 2.5
    this.trackerSettings.trackerStepSize = this.trackerSettings.trackerStepSize || 1
    this.trackerSettings.trackerEdgesDensity = this.trackerSettings.trackerEdgesDensity || 0.1

    // create a toggleable video element to process/show the webcam image
    this.videoContainer = document.createElement('div')
    this.videoContainer.innerHTML = `
    <video width="320" height="240" preload muted autoplay webkit-playsinline playsinline></video>
    <canvas width="320" height="240"></canvas>`
    this.videoContainer.classList.add(classVideoContainer)
    document.body.appendChild(this.videoContainer)
    this.videoEl = this.videoContainer.querySelector('video')
    this.canvas = this.videoContainer.querySelector('canvas')
    this.context = this.canvas.getContext('2d')

    this.faceCenter = { x: 0, y: 0 }

    this.mat = new Matrix4()
    this.vec = new Vector3()
    this.target = new Vector3()
    this.quat = new Quaternion()
  }

  addToPlot (plotEl) {
    if (Object.prototype.toString.call(plotEl) === '[object String]') {
      plotEl = document.getElementById(plotEl)
    }
    if (!plotEl || !plotEl._context) {
      throw new Error('PortalViewer requires a rendered plotly element')
    }
    this.plotEl = plotEl
    // extend the current config to avoid clobbering existing settings
    plotEl._context.modeBarButtonsToAdd.push([
      {
        name: passthroughBtnName,
        icon: {
          width: 1000,
          height: 1000,
          path: 'M336 0H48C21.5 0 0 21.5 0 48v416c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48V48c0-26.5-21.5-48-48-48zM192 128c35.3 0 64 28.7 64 64s-28.7 64-64 64-64-28.7-64-64 28.7-64 64-64zm112 236.8c0 10.6-10 19.2-22.4 19.2H102.4C90 384 80 375.4 80 364.8v-19.2c0-31.8 30.1-57.6 67.2-57.6h5c12.3 5.1 25.7 8 39.8 8s27.6-2.9 39.8-8h5c37.1 0 67.2 25.8 67.2 57.6v19.2z',
          transform: 'matrix(1.9 0 0 1.75 0 100)'
        },
        click: this.handlePassthroughClick.bind(this)
      },
      {
        name: activateButtonName,
        icon: {
          width: 1000,
          height: 1000,
          path: 'M448 32c-83.3 11-166.8 22-250 33-92 12.5-163.3 86.7-169 180-3.3 55.5 18 109.5 57.8 148.2L0 480c83.3-11 166.5-22 249.8-33 91.8-12.5 163.3-86.8 168.7-179.8 3.5-55.5-18-109.5-57.7-148.2L448 32zm-79.7 232.3c-4.2 79.5-74 139.2-152.8 134.5-79.5-4.7-140.7-71-136.3-151 4.5-79.2 74.3-139.3 153-134.5 79.3 4.7 140.5 71 136.1 151z',
          transform: 'matrix(1.75 0 0 1.75 0 100)'
        },
        click: this.handleActivationClick.bind(this)
      }
    ])

    window.Plotly.react(plotEl, plotEl.data, plotEl.layout, plotEl._context)
  }

  drawDebugRectangles (event) {
    const context = this.context
    const canvas = this.canvas
    context.clearRect(0, 0, canvas.width, canvas.height)
    event.data.forEach(function (rect) {
      context.strokeStyle = '#a64ceb'
      context.strokeRect(rect.x, rect.y, rect.width, rect.height)
      context.font = '11px Helvetica'
      context.fillStyle = '#fff'
    })
  }

  handleActivationClick () {
    this.toggleTracking()
  }

  handlePassthroughClick () {
    this.toggleVideo()
  }

  onTracked (event) {
    const webcam = this.videoEl
    var now = Date.now()
    if (this.canvas) {
      this.drawDebugRectangles(event)
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

  toggleTracking () {
    const btn = this.plotEl.querySelector(`a[data-title="${activateButtonName}"]`)
    if (this.isTracking) {
      this.stopTracking()
      btn.classList.remove(classTrackingBtnActive)
      btn.parentElement.classList.remove(classModebarActive)
      this.videoContainer.classList.remove(classTrackingActive)
    } else {
      this.startTracking()
      btn.classList.add(classTrackingBtnActive)
      btn.parentElement.classList.add(classModebarActive)
      this.videoContainer.classList.add(classTrackingActive)
    }
  }

  toggleVideo () {
    const btn = this.plotEl.querySelector(`a[data-title="${passthroughBtnName}"]`)
    if (btn.classList.contains(classVideoBtnActive)) {
      btn.classList.remove(classVideoBtnActive)
      this.videoContainer.classList.remove(classVideoActive)
    } else {
      btn.classList.add(classVideoBtnActive)
      this.videoContainer.classList.add(classVideoActive)
    }
  }
}
export default PortalViewer
