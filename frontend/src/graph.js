import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';

function Graph() {
    const canvasRef = useRef(null);
    const [points, setPoints] = useState([]);
    const [pointType, setPointType] = useState('red');
    const [decisionBoundary, setDecisionBoundary] = useState(null);
    const [modelCoefficients, setModelCoefficients] = useState(null);

    // Draw grid lines, points, and decision boundary on canvas
    const drawCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw decision background if we have model coefficients
        if (modelCoefficients) {
            const { coef, intercept } = modelCoefficients;
            
            // Draw gradient background based on decision boundary
            const imageData = ctx.createImageData(canvasWidth, canvasHeight);
            const data = imageData.data;
            
            for (let y = 0; y < canvasHeight; y++) {
                for (let x = 0; x < canvasWidth; x++) {
                    // For logistic regression: p = 1 / (1 + exp(-(w1*x + w2*y + b)))
                    const z = coef[0] * x + coef[1] * y + intercept;
                    const probability = 1 / (1 + Math.exp(-z));
                    
                    // Get pixel index
                    const idx = (y * canvasWidth + x) * 4;
                    
                    // Red for class 0, blue for class 1, with 40% opacity
                    data[idx] = Math.round(255 * (1 - probability)); // Red
                    data[idx + 1] = 0; // Green
                    data[idx + 2] = Math.round(255 * probability); // Blue
                    data[idx + 3] = 102;
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
        }

        // Draw grid lines
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        const gridSpacing = 40; // Space between grid lines
        
        // Vertical grid lines
        for (let x = gridSpacing; x < canvasWidth; x += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvasHeight);
            ctx.stroke();
        }

        // Horizontal grid lines
        for (let y = gridSpacing; y < canvasHeight; y += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvasWidth, y);
            ctx.stroke();
        }

        // Draw axis lines (X and Y)
        ctx.strokeStyle = '#000'; // Black for axis lines
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, canvasHeight / 2); // X axis
        ctx.lineTo(canvasWidth, canvasHeight / 2);
        ctx.moveTo(canvasWidth / 2, 0); // Y axis
        ctx.lineTo(canvasWidth / 2, canvasHeight);
        ctx.stroke();

        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.fillText('X', canvasWidth - 20, canvasHeight / 2 + 15);
        ctx.fillText('Y', canvasWidth / 2 + 10, 20);

        // Draw decision boundary line if available
        if (decisionBoundary) {
            ctx.beginPath();
            ctx.moveTo(decisionBoundary.x1, decisionBoundary.y1);
            ctx.lineTo(decisionBoundary.x2, decisionBoundary.y2);
            ctx.strokeStyle = '#000'; // Black for the boundary line
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw points
        points.forEach((point) => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = point.color;
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.stroke(); 
        });
    };

    useEffect(() => {
        drawCanvas();
    }, [points, decisionBoundary, modelCoefficients]);

    const handleCanvasClick = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const newPoint = { x, y, color: pointType };
        setPoints([...points, newPoint]);
    };

    const handlePredict = async () => {
        const trainPoints = points.filter(point => point.color === 'red' || point.color === 'blue');
        const predictPoints = points.filter(point => point.color === 'black');

        if (trainPoints.length < 2 || predictPoints.length === 0) {
            alert('Please add at least 2 training points and 1 prediction point.');
            return;
        }

        const X_train = trainPoints.map(point => [point.x, point.y]);
        const y_train = trainPoints.map(point => (point.color === 'red' ? 0 : 1));
        const X_predict = predictPoints.map(point => [point.x, point.y]);

        const data = { 
            X_train, 
            y_train, 
            X_predict,
            get_boundary: true,
            get_coefficients: true
        };

        try {
            const response = await axios.post('http://localhost:8000/api/predict/', data);
            const { predictions, boundary, coefficients } = response.data;

            const newPoints = [...points];

            let blackPointIndex = 0;
            for (let i = 0; i < newPoints.length; i++) {
                if (newPoints[i].color === 'black') {
                    const prob = predictions[blackPointIndex][1];
                    newPoints[i] = {
                        ...newPoints[i],
                        color: `rgba(${Math.round(255 * (1 - prob))}, 0, ${Math.round(255 * prob)}, 1)`
                    };
                    blackPointIndex++;
                }
            }

            setPoints(newPoints);
            if (boundary) {
                setDecisionBoundary(boundary);
            }
            if (coefficients) {
                setModelCoefficients(coefficients);
            }
        } catch (error) {
            console.error('Error sending data:', error);
            alert('Error communicating with the backend.');
        }
    };

    const handleClear = () => {
        setPoints([]);
        setDecisionBoundary(null);
        setModelCoefficients(null);
    };

    return (
        <div className="container">
            <h1 className="title">Logistic Regression Visualizer</h1>

            {/* Point Selector */}
            <div className="point-selector">
                {['red', 'blue', 'black'].map(color => (
                    <button
                        key={color}
                        onClick={() => setPointType(color)}
                        className={`point-button ${pointType === color ? `active-${color}` : ''}`}
                        style={{ color: color }}
                    >
                        {color === 'red' && 'Red (Class 0)'}
                        {color === 'blue' && 'Blue (Class 1)'}
                        {color === 'black' && 'Prediction'}
                    </button>
                ))}
            </div>

            {/* Canvas */}
            <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                width={400}
                height={400}
                className="canvas"
            />

            {/* Action Buttons */}
            <div className="action-buttons">
                <button
                    onClick={handlePredict}
                    className="predict-button"
                >
                    Predict
                </button>
                <button
                    onClick={handleClear}
                    className="clear-button"
                >
                    Clear All
                </button>
            </div>

            {/* Instructions */}
            <div className="instructions">
                <h3>Instructions</h3>
                <ul>
                    <li>Click "Red" or "Blue" to add training points.</li>
                    <li>Click "Prediction" to add points to classify.</li>
                    <li>Click "Predict" to run the logistic regression.</li>
                </ul>
            </div>
        </div>
    );
}

export default Graph;