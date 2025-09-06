import os, cv2, numpy as np
from dotenv import load_dotenv
from roboflow import Roboflow

load_dotenv()  # load server/.env

WORKSPACE = os.getenv("ROBOFLOW_WORKSPACE")
PROJECT   = os.getenv("ROBOFLOW_PROJECT")
VERSION   = int(os.getenv("ROBOFLOW_VERSION", "1"))
API_KEY   = os.getenv("ROBOFLOW_API_KEY")

def get_model():
    if not API_KEY:
        raise RuntimeError("Missing ROBOFLOW_API_KEY")
    rf = Roboflow(api_key=API_KEY)
    project = rf.workspace(WORKSPACE).project(PROJECT)
    return project.version(VERSION).model

def infer_image_array(img_bgr: np.ndarray):
    # write temp file because hosted=True expects path; alternately use local inference server
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        cv2.imwrite(tmp.name, img_bgr)
        path = tmp.name
    model = get_model()
    preds = model.predict(path, hosted=True).json()
    return preds
