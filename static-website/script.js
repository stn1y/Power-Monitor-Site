let chart;
let chartData = {
    labels: [],
    voltage: [],
    current: [],
    power: []
};

const translations = {
    en: {
        title: 'Data Visualizer',
        uploadCsv: 'Upload CSV',
        dataSmoothing: 'Data Smoothing:',
        rawData: 'Raw Data',
        points: 'Points',
        to: 'to',
        apply: 'Apply',
        voltage: 'Voltage',
        current: 'Current',
        power: 'Power',
        resetView: 'Reset View',
        date: 'Date',
        time: 'Time',
        noData: 'No data available for selected date range'
    },
    fr: {
        title: 'Visualiseur de Données',
        uploadCsv: 'Importer CSV',
        dataSmoothing: 'Lissage des données:',
        rawData: 'Données brutes',
        points: 'Points',
        to: 'à',
        apply: 'Appliquer',
        voltage: 'Tension',
        current: 'Courant',
        power: 'Puissance',
        resetView: 'Réinitialiser',
        date: 'Date',
        time: 'Heure',
        noData: 'Aucune donnée disponible pour la période sélectionnée'
    }
};

let currentLanguage = 'en';

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const voltageToggle = document.getElementById('voltageToggle');
    const currentToggle = document.getElementById('currentToggle');
    const powerToggle = document.getElementById('powerToggle');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const applyDateRange = document.getElementById('applyDateRange');
    const smoothingInterval = document.getElementById('smoothingInterval');

    fileInput.addEventListener('change', handleFileUpload);
    voltageToggle.addEventListener('change', updateChartVisibility);
    currentToggle.addEventListener('change', updateChartVisibility);
    powerToggle.addEventListener('change', updateChartVisibility);
    applyDateRange.addEventListener('click', applyDateFilter);
    smoothingInterval.addEventListener('change', () => {
        updateChart();
        updateTable();
    });

    // Add reset zoom button listener
    document.getElementById('resetZoom').addEventListener('click', () => {
        if (chart) chart.resetZoom();
    });

    // Add language toggle listener
    const languageToggle = document.getElementById('languageToggle');
    languageToggle.addEventListener('change', () => {
        currentLanguage = languageToggle.checked ? 'fr' : 'en';
        updateLanguage();
    });
});

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        processCSV(text);
    };
    reader.readAsText(file);
}

function processCSV(csv) {
    const lines = csv.split('\n');
    console.log('CSV lines:', lines.length);
    chartData = {
        labels: [],
        voltage: [],
        current: [],
        power: []
    };

    // Skip header row and process data
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
            const [date, time, voltage, current, power] = line.split(',').map(item => item.trim());
            if (date && time) {
                try {
                    const timestamp = new Date(`${date}T${time}`);
                    if (!isNaN(timestamp)) {
                        chartData.labels.push(timestamp);
                        chartData.voltage.push(parseFloat(voltage) || 0);
                        chartData.current.push(parseFloat(current) || 0);
                        chartData.power.push(parseFloat(power) || 0);
                    }
                } catch (e) {
                    console.warn('Error parsing line:', line);
                }
            }
        }
    }

    if (chartData.labels.length > 0) {
        console.log('Processed data points:', chartData.labels.length);
        
        const firstDate = chartData.labels[0];
        const lastDate = chartData.labels[chartData.labels.length - 1];
        
        // Set the date inputs to match the actual data range
        document.getElementById('startDate').value = firstDate.toISOString().split('T')[0];
        document.getElementById('endDate').value = lastDate.toISOString().split('T')[0];
        
        updateChart();
        updateTable();
    } else {
        alert('No valid data found in the CSV file');
    }
}

function smoothData(data, labels, windowSize) {
    if (windowSize <= 1) return { smoothedData: data, smoothedLabels: labels };

    const smoothedData = [];
    const smoothedLabels = [];

    for (let i = 0; i < data.length; i += windowSize) {
        const chunk = data.slice(i, i + windowSize);
        const labelChunk = labels.slice(i, i + windowSize);
        if (chunk.length > 0) {
            // Calculate average for the chunk
            const avg = chunk.reduce((sum, val) => sum + val, 0) / chunk.length;
            smoothedData.push(avg);
            // Use the middle timestamp for the chunk
            smoothedLabels.push(labelChunk[Math.floor(labelChunk.length / 2)]);
        }
    }

    return { smoothedData, smoothedLabels };
}

function updateChart() {
    const startDate = new Date(document.getElementById('startDate').value);
    const endDate = new Date(document.getElementById('endDate').value);
    
    // Don't modify the hours/minutes/seconds of the dates
    // This allows for partial day data to be displayed
    
    console.log('Date range:', startDate, 'to', endDate); // Debug log
    
    const filteredIndices = chartData.labels.map((date, index) => ({date, index}))
        .filter(item => {
            // Compare only the date portion for the start and end dates
            const itemDate = item.date.toISOString().split('T')[0];
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];
            return itemDate >= startDateStr && itemDate <= endDateStr;
        })
        .map(item => item.index);

    console.log('Filtered data points:', filteredIndices.length); // Debug log

    let filteredLabels = filteredIndices.map(i => chartData.labels[i]);
    let filteredVoltage = filteredIndices.map(i => chartData.voltage[i]);
    let filteredCurrent = filteredIndices.map(i => chartData.current[i]);
    let filteredPower = filteredIndices.map(i => chartData.power[i]);

    if (filteredLabels.length === 0) {
        console.warn('No data points in selected range');
        return;
    }

    const smoothingWindow = parseInt(document.getElementById('smoothingInterval').value);

    if (smoothingWindow > 1) {
        const smoothedVoltage = smoothData(filteredVoltage, filteredLabels, smoothingWindow);
        const smoothedCurrent = smoothData(filteredCurrent, filteredLabels, smoothingWindow);
        const smoothedPower = smoothData(filteredPower, filteredLabels, smoothingWindow);

        filteredLabels = smoothedVoltage.smoothedLabels;
        filteredVoltage = smoothedVoltage.smoothedData;
        filteredCurrent = smoothedCurrent.smoothedData;
        filteredPower = smoothedPower.smoothedData;
    }

    if (chart) {
        chart.destroy();
    }

    const voltageVisible = document.getElementById('voltageToggle').checked;
    const currentVisible = document.getElementById('currentToggle').checked;
    const powerVisible = document.getElementById('powerToggle').checked;

    const ctx = document.getElementById('dataChart').getContext('2d');
    
    // Calculate time span in hours
    const timeSpanHours = (filteredLabels[filteredLabels.length - 1] - filteredLabels[0]) / (1000 * 60 * 60);
    const isSmallDataset = timeSpanHours < 24;
    
    // Format dates for labels with appropriate precision
    const formattedLabels = filteredLabels.map(date => {
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',  // Always show seconds
            hour12: false
        });
    });

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: formattedLabels,
            datasets: [
                {
                    label: 'Voltage (V)',
                    data: filteredVoltage,
                    borderColor: 'red',
                    hidden: !voltageVisible,
                    pointRadius: 0,
                    borderWidth: 1,
                    yAxisID: 'voltage'
                },
                {
                    label: 'Current (A)',
                    data: filteredCurrent,
                    borderColor: 'blue',
                    hidden: !currentVisible,
                    pointRadius: 0,
                    borderWidth: 1,
                    yAxisID: 'current'
                },
                {
                    label: 'Power (W)',
                    data: filteredPower,
                    borderColor: 'green',
                    hidden: !powerVisible,
                    pointRadius: 0,
                    borderWidth: 1,
                    yAxisID: 'power'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: true,
                    callbacks: {
                        title: function(tooltipItems) {
                            if (!tooltipItems || tooltipItems.length === 0) return '';
                            const index = tooltipItems[0].dataIndex;
                            const date = filteredLabels[index];
                            return date.toLocaleString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: false
                            });
                        },
                        label: function(context) {
                            if (context.parsed.y !== null) {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
                            }
                            return '';
                        }
                    }
                },
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'x',
                        modifierKey: null
                    },
                    zoom: {
                        wheel: {
                            enabled: true,
                            speed: 0.1
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'x'
                    },
                    limits: {
                        x: {
                            min: 'original',
                            max: 'original'
                        }
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    type: 'category',
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        autoSkip: true,
                        maxTicksLimit: isSmallDataset ? 
                            Math.max(Math.min(filteredLabels.length, 50), 2) : // Show up to 50 ticks for small datasets
                            Math.min(24, Math.max(2, formattedLabels.length)),
                        color: '#b3b3b3'
                    },
                    title: {
                        display: true,
                        text: 'Date and Time',
                        color: '#b3b3b3'
                    }
                },
                voltage: {
                    type: 'linear',
                    display: voltageVisible,
                    position: 'left',
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#ff4757'
                    },
                    title: {
                        display: true,
                        text: 'Voltage (V)',
                        color: '#ff4757'
                    }
                },
                current: {
                    type: 'linear',
                    display: currentVisible,
                    position: 'right',
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#2196f3'
                    },
                    title: {
                        display: true,
                        text: 'Current (A)',
                        color: '#2196f3'
                    }
                },
                power: {
                    type: 'linear',
                    display: powerVisible,
                    position: 'right',
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#26de81'
                    },
                    title: {
                        display: true,
                        text: 'Power (W)',
                        color: '#26de81'
                    }
                }
            }
        }
    });

    updateSmoothingIndicator(smoothingWindow);
}

function updateTable() {
    console.log('Updating table...'); // Debug log
    const tbody = document.querySelector('#dataTable tbody');
    if (!tbody) {
        console.error('Table body not found!');
        return;
    }
    
    tbody.innerHTML = ''; // Clear existing rows

    const startDate = new Date(document.getElementById('startDate').value);
    const endDate = new Date(document.getElementById('endDate').value);

    console.log('Table date range:', startDate, 'to', endDate); // Debug log
    console.log('Total data points:', chartData.labels.length); // Debug log

    // Filter data points using the same logic as the chart
    const filteredIndices = chartData.labels.map((date, index) => ({date, index}))
        .filter(item => {
            const itemDate = item.date.toISOString().split('T')[0];
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];
            return itemDate >= startDateStr && itemDate <= endDateStr;
        })
        .map(item => item.index);

    // Calculate skip factor for large datasets
    const maxRows = 1000;
    let skipFactor = Math.ceil(filteredIndices.length / maxRows);
    skipFactor = Math.max(1, skipFactor);

    let rowsAdded = 0; // Counter for debugging

    // Create table rows
    for (let i = 0; i < filteredIndices.length; i += skipFactor) {
        const index = filteredIndices[i];
        const date = chartData.labels[index];
        
        const row = document.createElement('tr');
        
        // Format the date and time
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString();
        
        // Create the row with formatted numbers
        row.innerHTML = `
            <td>${dateStr}</td>
            <td>${timeStr}</td>
            <td>${chartData.voltage[index] !== undefined ? Number(chartData.voltage[index]).toFixed(2) : ''}</td>
            <td>${chartData.current[index] !== undefined ? Number(chartData.current[index]).toFixed(2) : ''}</td>
            <td>${chartData.power[index] !== undefined ? Number(chartData.power[index]).toFixed(2) : ''}</td>
        `;
        
        tbody.appendChild(row);
        rowsAdded++;
    }

    console.log('Rows added to table:', rowsAdded); // Debug log

    // Add a message if no data is shown
    if (rowsAdded === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="5" style="text-align: center;">${translations[currentLanguage].noData}</td>`;
        tbody.appendChild(row);
    }
}

function updateChartVisibility() {
    if (chart) {
        const voltageVisible = document.getElementById('voltageToggle').checked;
        const currentVisible = document.getElementById('currentToggle').checked;
        const powerVisible = document.getElementById('powerToggle').checked;

        chart.data.datasets[0].hidden = !voltageVisible;
        chart.data.datasets[1].hidden = !currentVisible;
        chart.data.datasets[2].hidden = !powerVisible;

        chart.options.scales.voltage.display = voltageVisible;
        chart.options.scales.current.display = currentVisible;
        chart.options.scales.power.display = powerVisible;

        chart.update();
    }
}

function applyDateFilter() {
    updateChart();
    updateTable();
}

function updateSmoothingIndicator(smoothingWindow) {
    const container = document.querySelector('.smoothing-indicator');
    if (!container) {
        console.error('Smoothing indicator container not found');
        return;
    }

    const intervalMap = {
        '15': '15 points',
        '10': '10 points',
        '5': '5 points',
        '1': 'Raw data'
    };

    container.textContent = intervalMap[smoothingWindow] || 'Raw data';
    container.style.display = 'block';
}

function updateLanguage() {
    const t = translations[currentLanguage];
    
    // Update static text
    document.querySelector('h1').textContent = t.title;
    document.querySelector('label[for="fileInput"]').textContent = t.uploadCsv;
    document.querySelector('label[for="smoothingInterval"]').textContent = t.dataSmoothing;
    document.querySelector('.date-picker span').textContent = t.to;
    document.getElementById('applyDateRange').textContent = t.apply;
    document.querySelector('label.voltage').childNodes[1].textContent = t.voltage;
    document.querySelector('label.current').childNodes[1].textContent = t.current;
    document.querySelector('label.power').childNodes[1].textContent = t.power;
    document.getElementById('resetZoom').textContent = t.resetView;
    
    // Update table headers
    const headers = document.querySelectorAll('#dataTable th');
    headers[0].textContent = t.date;
    headers[1].textContent = t.time;
    headers[2].textContent = t.voltage;
    headers[3].textContent = t.current;
    headers[4].textContent = t.power;
    
    // Update smoothing interval options
    const smoothingSelect = document.getElementById('smoothingInterval');
    smoothingSelect.options[0].textContent = t.rawData;
    for (let i = 1; i < smoothingSelect.options.length; i++) {
        const points = smoothingSelect.options[i].value;
        smoothingSelect.options[i].textContent = `${points} ${t.points}`;
    }
    
    // Update chart if it exists
    if (chart) {
        chart.options.scales.voltage.title.text = `${t.voltage} (V)`;
        chart.options.scales.current.title.text = `${t.current} (A)`;
        chart.options.scales.power.title.text = `${t.power} (W)`;
        chart.data.datasets[0].label = `${t.voltage} (V)`;
        chart.data.datasets[1].label = `${t.current} (A)`;
        chart.data.datasets[2].label = `${t.power} (W)`;
        chart.update();
    }
}