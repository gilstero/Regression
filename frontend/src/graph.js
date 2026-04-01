const CANVAS_SIZE = 400;
const GRID_SPACING = 40;
const API_URL = "http://127.0.0.1:8000/api/predict/";

const POINT_TYPES = {
  red: {
    label: "Red (Class 0)",
    color: "#d64545",
    buttonClass: "is-red",
  },
  blue: {
    label: "Blue (Class 1)",
    color: "#2a63d4",
    buttonClass: "is-blue",
  },
  black: {
    label: "Prediction",
    color: "#111111",
    buttonClass: "is-black",
  },
};

export function createVisualizerApp(root) {
  let points = [];
  let selectedType = "red";
  let decisionBoundary = null;
  let modelCoefficients = null;

  root.innerHTML = `
    <main class="app-shell">
      <section class="hero-card">
        <p class="eyebrow">Interactive ML Demo</p>
        <h1>Logistic Regression Visualizer</h1>
        <p class="lede">
          Add red and blue training points, place black prediction points, then
          ask the model to classify them against your backend.
        </p>
      </section>

      <section class="workspace">
        <div class="canvas-panel">
          <div class="toolbar" id="point-toolbar"></div>

          <canvas
            id="graph-canvas"
            class="graph-canvas"
            width="${CANVAS_SIZE}"
            height="${CANVAS_SIZE}"
          ></canvas>

          <div class="actions">
            <button type="button" class="primary-button" id="predict-button">
              Predict
            </button>
            <button type="button" class="secondary-button" id="clear-button">
              Clear All
            </button>
          </div>

          <p class="status-message" id="status-message" role="status">
            Ready for points.
          </p>
        </div>

        <aside class="info-card">
          <h2>How to use it</h2>
          <ul>
            <li>Pick a point type at the top.</li>
            <li>Click inside the canvas to place points.</li>
            <li>Add at least one red point and one blue point.</li>
            <li>Add black prediction points, then click Predict.</li>
          </ul>
        </aside>
      </section>
    </main>
  `;

  const canvas = root.querySelector("#graph-canvas");
  const ctx = canvas.getContext("2d");
  const toolbar = root.querySelector("#point-toolbar");
  const predictButton = root.querySelector("#predict-button");
  const clearButton = root.querySelector("#clear-button");
  const statusMessage = root.querySelector("#status-message");

  function setStatus(message, kind = "info") {
    statusMessage.textContent = message;
    statusMessage.dataset.kind = kind;
  }

  function renderToolbar() {
    toolbar.innerHTML = "";

    Object.entries(POINT_TYPES).forEach(([type, config]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `toolbar-button ${config.buttonClass}`;
      button.textContent = config.label;
      button.dataset.active = String(selectedType === type);
      button.addEventListener("click", () => {
        selectedType = type;
        renderToolbar();
      });
      toolbar.appendChild(button);
    });
  }

  function drawBackground() {
    if (!modelCoefficients) {
      return;
    }

    const imageData = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
    const data = imageData.data;
    const { coef, intercept } = modelCoefficients;

    for (let y = 0; y < CANVAS_SIZE; y += 1) {
      for (let x = 0; x < CANVAS_SIZE; x += 1) {
        const z = coef[0] * x + coef[1] * y + intercept;
        const probability = 1 / (1 + Math.exp(-z));
        const index = (y * CANVAS_SIZE + x) * 4;

        data[index] = Math.round(255 * (1 - probability));
        data[index + 1] = 78;
        data[index + 2] = Math.round(255 * probability);
        data[index + 3] = 85;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  function drawGrid() {
    ctx.strokeStyle = "#d7dde8";
    ctx.lineWidth = 1;

    for (let x = GRID_SPACING; x < CANVAS_SIZE; x += GRID_SPACING) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_SIZE);
      ctx.stroke();
    }

    for (let y = GRID_SPACING; y < CANVAS_SIZE; y += GRID_SPACING) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_SIZE, y);
      ctx.stroke();
    }

    ctx.strokeStyle = "#18202d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_SIZE / 2);
    ctx.lineTo(CANVAS_SIZE, CANVAS_SIZE / 2);
    ctx.moveTo(CANVAS_SIZE / 2, 0);
    ctx.lineTo(CANVAS_SIZE / 2, CANVAS_SIZE);
    ctx.stroke();
  }

  function drawBoundary() {
    if (!decisionBoundary) {
      return;
    }

    ctx.beginPath();
    ctx.moveTo(decisionBoundary.x1, decisionBoundary.y1);
    ctx.lineTo(decisionBoundary.x2, decisionBoundary.y2);
    ctx.strokeStyle = "#141414";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  function drawPoints() {
    points.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = point.renderColor;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }

  function drawCanvas() {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.fillStyle = "#f9fbff";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    drawBackground();
    drawGrid();
    drawBoundary();
    drawPoints();
  }

  function canvasPointFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function addPoint(event) {
    const { x, y } = canvasPointFromEvent(event);
    const config = POINT_TYPES[selectedType];

    points = [
      ...points,
      {
        x,
        y,
        type: selectedType,
        renderColor: config.color,
      },
    ];

    drawCanvas();
    setStatus(`Added a ${config.label.toLowerCase()} point.`, "info");
  }

  async function handlePredict() {
    const trainPoints = points.filter((point) => point.type === "red" || point.type === "blue");
    const predictPoints = points.filter((point) => point.type === "black");

    const hasRed = trainPoints.some((point) => point.type === "red");
    const hasBlue = trainPoints.some((point) => point.type === "blue");

    if (!hasRed || !hasBlue || predictPoints.length === 0) {
      setStatus(
        "Add at least one red point, one blue point, and one prediction point first.",
        "error"
      );
      return;
    }

    predictButton.disabled = true;
    setStatus("Running logistic regression against the backend...", "info");

    const payload = {
      X_train: trainPoints.map((point) => [point.x, point.y]),
      y_train: trainPoints.map((point) => (point.type === "red" ? 0 : 1)),
      X_predict: predictPoints.map((point) => [point.x, point.y]),
      get_boundary: true,
      get_coefficients: true,
    };

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Prediction failed.");
      }

      let predictionIndex = 0;
      points = points.map((point) => {
        if (point.type !== "black") {
          return point;
        }

        const probability = data.predictions[predictionIndex][1];
        predictionIndex += 1;

        return {
          ...point,
          renderColor: `rgb(${Math.round(255 * (1 - probability))}, 50, ${Math.round(
            255 * probability
          )})`,
        };
      });

      decisionBoundary = data.boundary || null;
      modelCoefficients = data.coefficients || null;
      drawCanvas();
      setStatus("Prediction complete.", "success");
    } catch (error) {
      setStatus(error.message || "Could not reach the backend.", "error");
    } finally {
      predictButton.disabled = false;
    }
  }

  function handleClear() {
    points = [];
    decisionBoundary = null;
    modelCoefficients = null;
    drawCanvas();
    setStatus("Canvas cleared.", "info");
  }

  canvas.addEventListener("click", addPoint);
  predictButton.addEventListener("click", handlePredict);
  clearButton.addEventListener("click", handleClear);

  renderToolbar();
  drawCanvas();
}
