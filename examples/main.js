window.Plotly = require('plotly.js-dist')
const PortalViewer = require('../dist/plotly-portal-viewer.js')

window.addEventListener('DOMContentLoaded', () => {
  const myPortalViewer = new PortalViewer()
  // passed to newPlot().then to run after first plotting complete
  function addPortalViewerAfterFirstPlot () {
    myPortalViewer.addToPlot('myDiv')
    // PortalViewer adds modebar buttons, but you can also control it directly
    myPortalViewer.toggleVideo() // Sets video passthrough to be on by default
    document.getElementById('id-activate-button').addEventListener('click', () => {
      myPortalViewer.toggleTracking()
    })
  }

  // Build a plot
  window.Plotly.d3.csv('./birth-death-health-2012.csv', function (err, rows) {
    if (err) {
      throw err
    }
    function unpack (rows, key) {
      return rows.map(function (row) { return row[key] })
    }

    var trace1 = {
      x: unpack(rows, 'birth'),
      y: unpack(rows, 'death'),
      z: unpack(rows, 'health'),
      text: unpack(rows, 'Country'),
      hovertemplate: [
        '%{text}',
        'Births per 1,000: %{x:.1f}',
        'Deaths per 1,000: %{y:.1f}',
        'Health spending per 1: %{z:$,.0f}'
      ].join('<br>'),
      mode: 'markers',
      marker: {
        size: 12,
        line: {
          width: 0
        },
        opacity: 1
      },
      type: 'scatter3d',
      name: ''
    }

    var data = [trace1]
    var layout = {
      height: document.querySelector('#myDiv').clientHeight,
      margin: {
        l: 0,
        r: 0,
        b: 0,
        t: 30
      },
      scene: {
        camera: {
          eye: {
            x: 0,
            y: -2,
            z: 0
          }
        },
        xaxis: {
          title: 'Birth Rate'
        },
        yaxis: {
          title: 'Death Rate'
        },
        zaxis: {
          title: 'Health spending',
          tickformat: '$,d'
        }
      },
      title: 'Health Expenditures v. Population Determinants - 2012',
      font: {
        color: '#666'
      }
    }
    // inital layout and config settings are preserved when adding portal view
    window.Plotly.newPlot('myDiv', data, layout)
      // calls myPortalViewer.addToPlot('myDiv')
      .then(addPortalViewerAfterFirstPlot)
  })
})
