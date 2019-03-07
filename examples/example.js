window.addEventListener('plotted', () => {
  return new window.FaceTrackingCamera(
    document.querySelector('#myDiv'),
    document.querySelector('#myVideo'),
    null,
    null,
    document.querySelector('#myDebugCanvas')
  )
})
