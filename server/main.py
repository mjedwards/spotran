import io, os, base64, cv2, numpy as np
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
from rf_infer import infer_image_array

app = FastAPI()

# CORS for your React dev server
origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/infer")
async def infer(file: UploadFile = File(...)):
    # read bytes -> BGR numpy
    data = await file.read()
    img = Image.open(io.BytesIO(data)).convert("RGB")
    img_np = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

    preds = infer_image_array(img_np)

    # return raw predictions (frontend can draw boxes)
    return JSONResponse(content=preds)

# (Optional) helper to return annotated image as base64
@app.post("/infer/annotated")
async def infer_annotated(file: UploadFile = File(...)):
    data = await file.read()
    img = Image.open(io.BytesIO(data)).convert("RGB")
    img_np = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

    preds = infer_image_array(img_np)

    # very simple drawing (bbox), client can do nicer overlays
    for p in preds.get("predictions", []):
        x,y,w,h = p["x"], p["y"], p["width"], p["height"]
        x1, y1 = int(x - w/2), int(y - h/2)
        x2, y2 = int(x + w/2), int(y + h/2)
        cv2.rectangle(img_np, (x1,y1), (x2,y2), (0,255,0), 2)
        label = f"{p.get('class','obj')} {float(p.get('confidence',0.0)):.2f}"
        cv2.putText(img_np, label, (x1, max(y1-6, 10)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,255,0), 1, cv2.LINE_AA)

    _, buf = cv2.imencode(".jpg", img_np)
    b64 = base64.b64encode(buf.tobytes()).decode("utf-8")
    return {"image_base64": f"data:image/jpeg;base64,{b64}", "predictions": preds.get("predictions", [])}
