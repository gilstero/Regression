import numpy as np
from sklearn.linear_model import LogisticRegression

def train_model(X, y):
    model = LogisticRegression()
    model.fit(X, y)
    return model

def predict1(model, X_input):
    return model.predict_proba(X_input)

def predict2(model, X_input):
    return model.predict(X_input)

def db(model, canvas_width=400, canvas_height=400):
    if hasattr(model, 'coef_') and hasattr(model, 'intercept_'):
        coef = model.coef_[0]  # Get coefficients [w1, w2]
        intercept = model.intercept_[0]  # Get intercept b
        
        if abs(coef[0]) < abs(coef[1]):
            # Find where the line crosses the top and bottom of canvas
            x1 = (-intercept - coef[1] * 0) / coef[0] if coef[0] != 0 else 0
            x2 = (-intercept - coef[1] * canvas_height) / coef[0] if coef[0] != 0 else 0
            boundary = {"x1": float(x1), "y1": 0, "x2": float(x2), "y2": canvas_height}
        else:
            # Find where the line crosses the left and right of canvas
            y1 = (-intercept - coef[0] * 0) / coef[1] if coef[1] != 0 else 0
            y2 = (-intercept - coef[0] * canvas_width) / coef[1] if coef[1] != 0 else 0
            boundary = {"x1": 0, "y1": float(y1), "x2": canvas_width, "y2": float(y2)}
        
        # Check if the line is outside the canvas bounds
        if ((boundary["x1"] < 0 and boundary["x2"] < 0) or 
            (boundary["x1"] > canvas_width and boundary["x2"] > canvas_width) or
            (boundary["y1"] < 0 and boundary["y2"] < 0) or
            (boundary["y1"] > canvas_height and boundary["y2"] > canvas_height)):
            return None
        
        return boundary
    
    return None