window.Plotly.d3.csv('./iris.csv', function (err, rows) {
  if (err) {
    throw err
  }
  function unpack (rows, key) {
    return rows.map(function (row) { return row[key] })
  }

  var trace1 = {
    x: unpack(rows, 'Petal.Length'),
    y: unpack(rows, 'Petal.Width'),
    z: unpack(rows, 'Sepal.Length'),
    mode: 'markers',
    marker: {
      size: 12,
      line: {
        color: 'rgb(217, 217, 217)',
        width: 0.5
      },
      opacity: 0.8 },
    type: 'scatter3d'
  }

  var data = [trace1]
  var layout = {
    margin: {
      l: 0,
      r: 0,
      b: 0,
      t: 0
    },
    scene: {
      aspectmode: 'cube',
      camera: {
        eye: {
          x: 0,
          y: -2,
          z: 0
        },
        center: {
          x: 0,
          y: 0,
          z: 0
        }
      }
    }
  }
  window.Plotly.newPlot('myDiv', data, layout)
  window.dispatchEvent(new window.CustomEvent('plotted'))
})
