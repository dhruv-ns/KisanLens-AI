import sys
import json
import os
import joblib
import pandas as pd

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "yield_model.joblib")
META_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "yield_model_meta.json")

def format_single_prediction(crop, country, rainfall, temperature, pesticides, farm_area, pred_hg_ha):
    pred_hg_ha = max(0.0, round(float(pred_hg_ha), 2))
    kg_per_ha = round(pred_hg_ha / 10.0, 2)
    tonnes_per_ha = round(pred_hg_ha / 10000.0, 3)
    quintals_per_acre = round(pred_hg_ha * 0.000404686, 2)
    kg_per_acre = round(quintals_per_acre * 100.0, 2)
    total_production_quintals = round(quintals_per_acre * farm_area, 2)
    total_production_tonnes = round(total_production_quintals * 0.1, 2)
    
    return {
        "crop": crop,
        "country": country,
        "inputs": {
            "rainfall_mm": rainfall,
            "temperature_c": temperature,
            "pesticides_tonnes": pesticides,
            "farm_area_acres": farm_area
        },
        "yield_hg_ha": pred_hg_ha,
        "kg_per_ha": kg_per_ha,
        "tonnes_per_ha": tonnes_per_ha,
        "quintals_per_acre": quintals_per_acre,
        "kg_per_acre": kg_per_acre,
        "total_production_quintals": total_production_quintals,
        "total_production_tonnes": total_production_tonnes
    }

def run_predictions(input_data):
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")

    model = joblib.load(MODEL_PATH)
    
    # Check if batch mode
    if "crops" in input_data and isinstance(input_data["crops"], list):
        crops = input_data["crops"]
        country = input_data.get("country", "India")
        rainfall = float(input_data.get("rainfall", 1000.0))
        pesticides = float(input_data.get("pesticides", 50000.0))
        temperature = float(input_data.get("temperature", 25.0))
        farm_area = float(input_data.get("farmArea", 1.0))
        
        rows = [
            {
                "country": country,
                "crop": c,
                "rainfall": rainfall,
                "pesticides": pesticides,
                "temperature": temperature
            }
            for c in crops
        ]
        df_input = pd.DataFrame(rows)
        preds = model.predict(df_input)
        
        results = [
            format_single_prediction(c, country, rainfall, temperature, pesticides, farm_area, p)
            for c, p in zip(crops, preds)
        ]
        return {
            "success": True,
            "is_batch": True,
            "predictions": results
        }
    else:
        # Single mode
        country = input_data.get("country", "India")
        crop = input_data.get("crop", "Wheat")
        rainfall = float(input_data.get("rainfall", 1000.0))
        pesticides = float(input_data.get("pesticides", 50000.0))
        temperature = float(input_data.get("temperature", 25.0))
        farm_area = float(input_data.get("farmArea", 1.0))
        
        df_input = pd.DataFrame([{
            "country": country,
            "crop": crop,
            "rainfall": rainfall,
            "pesticides": pesticides,
            "temperature": temperature
        }])
        
        pred_hg_ha = model.predict(df_input)[0]
        result = format_single_prediction(crop, country, rainfall, temperature, pesticides, farm_area, pred_hg_ha)
        
        return {
            "success": True,
            "prediction": result
        }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        raw = sys.argv[1]
        try:
            data = json.loads(raw)
        except Exception:
            data = {}
    else:
        raw = sys.stdin.read()
        try:
            data = json.loads(raw)
        except Exception:
            data = {}
            
    try:
        res = run_predictions(data)
        print(json.dumps(res))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)
