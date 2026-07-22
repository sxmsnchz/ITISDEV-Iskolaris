// Iskolaris Data Charting Interface (Chart.js Configuration)

let gpaChartInstance = null;
let pieChartInstance = null;

// "Render GPA Line Chart Engine"
function renderGPALineChart(historyData, thresholdLimit) {
  const ctx = document.getElementById('gpaChart').getContext('2d');

  // Sort history chronologically from backend
  const terms = historyData.map(h => h.termName);
  const tgpaVals = historyData.map(h => h.tgpa);
  const cgpaVals = historyData.map(h => h.cgpa);

  // Re-populate thresholds array matching terms length
  const thresholdVals = new Array(terms.length).fill(thresholdLimit);

  // Destroy previous instance to prevent visual glitches
  if (gpaChartInstance) {
    gpaChartInstance.destroy();
  }

  gpaChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: terms,
      datasets: [
        {
          label: 'Cumulative GPA (CGPA)',
          data: cgpaVals,
          borderColor: '#00e676',
          backgroundColor: 'rgba(0, 230, 118, 0.1)',
          borderWidth: 3,
          tension: 0.3,
          fill: true,
          pointBackgroundColor: '#00e676',
          pointBorderColor: '#ffffff',
          pointHoverRadius: 7
        },
        {
          label: 'Term GPA (TGPA)',
          data: tgpaVals,
          borderColor: '#40c4ff',
          backgroundColor: 'rgba(64, 196, 255, 0.05)',
          borderWidth: 2,
          tension: 0.3,
          borderDash: [5, 5],
          pointBackgroundColor: '#40c4ff'
        },
        {
          label: 'Minimum Retention Limit',
          data: thresholdVals,
          borderColor: '#ff5252',
          borderWidth: 2,
          pointRadius: 0,
          borderDash: [2, 2],
          fill: false,
          borderColor: 'rgba(255, 82, 82, 0.8)'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#8b9bb4',
            font: { family: 'Outfit', size: 12 }
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        y: {
          min: 0.0,
          max: 4.0,
          ticks: {
            color: '#8b9bb4',
            stepSize: 0.5,
            font: { family: 'Outfit' }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          }
        },
        x: {
          ticks: {
            color: '#8b9bb4',
            font: { family: 'Outfit' }
          },
          grid: {
            display: false
          }
        }
      }
    }
  });
}

// "Render Expense Distribution Pie Chart"
function renderBudgetCharts(transactions) {
  const pieCanvas = document.getElementById('expensePieChart');
  if (!pieCanvas) return;

  const ctx = pieCanvas.getContext('2d');

  // Compute categories summation
  const categories = {
    food: 0,
    transportation: 0,
    'dorm rent': 0,
    'school supplies': 0,
    other: 0
  };

  transactions.forEach(t => {
    if (t.type === 'expense') {
      const cat = t.category;
      if (categories.hasOwnProperty(cat)) {
        categories[cat] += t.amount;
      } else {
        categories.other += t.amount;
      }
    }
  });

  const dataValues = [
    categories.food,
    categories.transportation,
    categories['dorm rent'],
    categories['school supplies'],
    categories.other
  ];

  const totalExpense = dataValues.reduce((a, b) => a + b, 0);

  if (pieChartInstance) {
    pieChartInstance.destroy();
  }

  // Draw empty placeholder values if zero expenses recorded
  if (totalExpense === 0) {
    pieChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['No Expenses logged'],
        datasets: [{
          data: [1],
          backgroundColor: ['#202D3E'],
          borderColor: 'transparent'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#8b9bb4', font: { family: 'Outfit' } }
          }
        }
      }
    });
    return;
  }

  pieChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Food', 'Commute', 'Dorm Rent', 'School Books', 'Other'],
      datasets: [{
        data: dataValues,
        backgroundColor: [
          '#00e676', // Food - Mint Green
          '#40c4ff', // Commute - blue
          '#ff9100', // Dorm - Orange
          '#ffd740', // School - Yellow
          '#b0bec5'  // Other - Grey
        ],
        borderWidth: 2,
        borderColor: '#121820'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#8b9bb4',
            font: { family: 'Outfit', size: 11 },
            boxWidth: 12
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.raw;
              const percent = ((val / totalExpense) * 100).toFixed(0);
              return ` ₱${val.toLocaleString()} (${percent}%)`;
            }
          }
        }
      },
      cutout: '60%'
    }
  });
}
