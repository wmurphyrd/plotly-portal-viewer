window.addEventListener('plotted', () => {
  const myFaceTracker = new window.FaceTrackingCamera()
  myFaceTracker.addToPlot('myDiv')
})
