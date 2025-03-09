from django.shortcuts import render
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from .utils import train_model, predict1, predict2, db
import numpy as np

class predictView(APIView):
    
    def post(self, request):
        try:
            data = request.data
            
            X_train = np.array(data.get('X_train'))
            y_train = np.array(data.get('y_train'))
            X_predict = np.array(data.get('X_predict'))
            get_boundary = data.get('get_boundary', False)
            get_coefficients = data.get('get_coefficients', False)
            
        except Exception as e:
            return Response(
                {"error": f"Invalid input data: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            if len(X_train) < 2 or len(np.unique(y_train)) < 2:
                return Response(
                    {"error": "Need at least two training points with different classes"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            model = train_model(X_train, y_train)
            predictions = predict1(model, X_predict)
            predictions_list = predictions.tolist()
            
            response_data = {"predictions": predictions_list}
            
            if get_boundary:
                boundary = db(model)
                if boundary:
                    response_data["boundary"] = boundary
                    
            if get_coefficients and hasattr(model, 'coef_') and hasattr(model, 'intercept_'):
                response_data["coefficients"] = {
                    "coef": model.coef_[0].tolist(),
                    "intercept": float(model.intercept_[0])
                }
            
            return Response(response_data, status=200)
            
        except Exception as e:
            return Response({"error": f"Model error: {str(e)}"}, status=500)
        
class predictViewAbsolute(APIView):

    def post(self, request):
        try:
            data = request.data

            X_train = np.array(data.get('X_train'))
            y_train = np.array(data.get('y_train'))
            X_predict = np.array(data.get('X_predict'))

        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:

            model = train_model(X_train, y_train)
            predictions = predict2(model, X_predict)
            predictions_list = predictions.tolist()
            
            return Response({"predictions": predictions_list}, status=200)
        except Exception as e:

            return Response({"error": str(e)}, status=500)

