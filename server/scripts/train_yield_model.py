import os
import json
import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score, mean_absolute_error

DATASET_PATH = r"d:\Documents\KisanLens AI\server\data\dataset\yield_df.csv"
OUTPUT_DIR = r"d:\Documents\KisanLens AI\server\data"
MODEL_PATH = os.path.join(OUTPUT_DIR, "yield_model.joblib")
META_PATH = os.path.join(OUTPUT_DIR, "yield_model_meta.json")

def main():
    print("Loading dataset from:", DATASET_PATH)
    df = pd.read_csv(DATASET_PATH)
    
    # Clean column names
    df = df.rename(columns={
        "average_rain_fall_mm_per_year": "rainfall",
        "pesticides_tonnes": "pesticides",
        "avg_temp": "temperature",
        "hg/ha_yield": "yield_hg_ha",
        "Area": "country",
        "Item": "crop",
        "Year": "year"
    })
    
    # Drop index column if present
    if "Unnamed: 0" in df.columns:
        df = df.drop(columns=["Unnamed: 0"])
    if "" in df.columns:
        df = df.drop(columns=[""])
        
    # Ensure numeric
    df["rainfall"] = pd.to_numeric(df["rainfall"], errors="coerce")
    df["pesticides"] = pd.to_numeric(df["pesticides"], errors="coerce")
    df["temperature"] = pd.to_numeric(df["temperature"], errors="coerce")
    df["yield_hg_ha"] = pd.to_numeric(df["yield_hg_ha"], errors="coerce")
    df = df.dropna()
    
    print(f"Dataset cleaned. Total valid records: {len(df)}")
    
    # Extract unique crops & top countries
    crops = sorted(df["crop"].unique().tolist())
    countries = sorted(df["country"].unique().tolist())
    
    print(f"Crops ({len(crops)}): {crops}")
    print(f"Countries count: {len(countries)}, India in dataset: {'India' in countries}")

    # Build comprehensive metadata & benchmarks
    meta = {
        "dataset_info": {
            "total_records": len(df),
            "years": [int(df["year"].min()), int(df["year"].max())],
            "crops_count": len(crops),
            "countries_count": len(countries)
        },
        "crops": crops,
        "countries": countries,
        "crop_stats": {},
        "historical_trends": {}
    }
    
    # Compute per-crop benchmarks
    for crop in crops:
        crop_df = df[df["crop"] == crop]
        india_df = crop_df[crop_df["country"] == "India"]
        ref_df = india_df if len(india_df) >= 10 else crop_df
        
        # High-yield subset (top 25% yields for optimal conditions estimation)
        top_quartile = crop_df[crop_df["yield_hg_ha"] >= crop_df["yield_hg_ha"].quantile(0.75)]
        
        meta["crop_stats"][crop] = {
            "mean_yield_hg_ha": round(float(crop_df["yield_hg_ha"].mean()), 2),
            "median_yield_hg_ha": round(float(crop_df["yield_hg_ha"].median()), 2),
            "min_yield_hg_ha": round(float(crop_df["yield_hg_ha"].min()), 2),
            "max_yield_hg_ha": round(float(crop_df["yield_hg_ha"].max()), 2),
            "india_mean_yield_hg_ha": round(float(india_df["yield_hg_ha"].mean()), 2) if len(india_df) > 0 else round(float(crop_df["yield_hg_ha"].mean()), 2),
            # Optimal environmental conditions based on top 25% performing harvests
            "optimal_temperature": {
                "min": round(float(top_quartile["temperature"].quantile(0.15)), 1),
                "max": round(float(top_quartile["temperature"].quantile(0.85)), 1),
                "ideal": round(float(top_quartile["temperature"].median()), 1)
            },
            "optimal_rainfall": {
                "min": round(float(top_quartile["rainfall"].quantile(0.15)), 1),
                "max": round(float(top_quartile["rainfall"].quantile(0.85)), 1),
                "ideal": round(float(top_quartile["rainfall"].median()), 1)
            },
            "pesticide_median_tonnes": round(float(ref_df["pesticides"].median()), 2)
        }
        
        # Historical yearly averages
        yearly = crop_df.groupby("year")["yield_hg_ha"].mean().reset_index()
        meta["historical_trends"][crop] = [
            {"year": int(row["year"]), "avg_yield_hg_ha": round(float(row["yield_hg_ha"]), 1)}
            for _, row in yearly.iterrows()
        ]
        
    # Model Training
    X = df[["country", "crop", "rainfall", "pesticides", "temperature"]]
    y = df["yield_hg_ha"]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), ["country", "crop"]),
            ("num", "passthrough", ["rainfall", "pesticides", "temperature"])
        ]
    )
    
    # Random Forest Regressor
    model = Pipeline([
        ("preprocessor", preprocessor),
        ("regressor", RandomForestRegressor(n_estimators=100, max_depth=20, random_state=42, n_jobs=-1))
    ])
    
    print("Training Random Forest Regressor...")
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    
    print(f"Model Performance:")
    print(f"  R2 Score: {r2:.4f}")
    print(f"  MAE: {mae:.2f} hg/ha")
    
    meta["model_metrics"] = {
        "algorithm": "RandomForestRegressor",
        "r2_score": round(float(r2), 4),
        "mae_hg_ha": round(float(mae), 2),
        "test_size": 0.2
    }
    
    # Save artifacts
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print("Saving model to:", MODEL_PATH)
    joblib.dump(model, MODEL_PATH)
    
    print("Saving metadata to:", META_PATH)
    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
        
    print("Training and metadata export complete successfully!")

if __name__ == "__main__":
    main()
