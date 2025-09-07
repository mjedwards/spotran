import io
from fastapi import APIRouter, UploadFile, File
from PIL import Image
from ultralytics import YOLO

# Create a router for this endpoint
router = APIRouter()

# Load the pose model once (nano = fastest for testing)
pose_model = YOLO("yolov8n-pose.pt")

@router.post("/pose")
async def pose_infer(file: UploadFile = File(...)):
    # Read the uploaded image into a PIL image
    img = Image.open(io.BytesIO(await file.read())).convert("RGB")

    # Run inference
    res = pose_model(img)

    # Extract keypoints for the first detected person
    keypoints = []
    if len(res[0].keypoints) > 0:
        for kp in res[0].keypoints.xy[0].tolist():
            x, y = kp
            keypoints.append({"x": float(x), "y": float(y)})

    return {"keypoints": keypoints}
