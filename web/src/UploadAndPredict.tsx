/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL as string;

interface PointsInterface {
	x: number;
	y: number;
}

interface KeypointsInterface {
	keypoints: PointsInterface[];
}

export default function UploadAndPredict() {
	const [file, setFile] = useState<File | null>(null);
	const [preds, setPreds] = useState<KeypointsInterface>({ keypoints: [] });
	const [annotated, setAnnotated] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const tarp = useRef<HTMLCanvasElement>(null);
	const [tempURL, setTempURL] = useState<string>();
	// const drawSkeleton = (context: any, points: PointsInterface) => {
	// 	context.lineWidth = 10;
	// 	context.beginPath();
	// 	context.moveTo(points.x, points.y);
	// 	context.closePath();
	// 	context.stroke();
	// };

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!file) return;
		setTempURL(URL.createObjectURL(file));
		setLoading(true);
		const form = new FormData();
		form.append("file", file);
		const res = await fetch(`${API_URL}/pose`, {
			method: "POST",
			body: form,
		});
		const data = await res.json();
		setPreds({ keypoints: data.keypoints });
		setAnnotated(data.image_base64 || null);
		setLoading(false);
	}

	useEffect(() => {
		if (!tempURL || !tarp.current || !preds.keypoints.length) return;

		const canvas = tarp.current;
		const ctx = tarp.current.getContext("2d");

		if (!ctx) return;

		const img = new Image();
		img.onload = () => {
			canvas.width = img.naturalWidth;
			canvas.height = img.naturalHeight;

			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

			ctx.fillStyle = "green";
			for (const kp of preds.keypoints) {
				ctx.fillRect(kp.x - 2, kp.y - 2, 4, 4);
			}
		};

		img.src = tempURL;
		return () => URL.revokeObjectURL(tempURL);
	}, [preds, tempURL]);

	return (
		<div>
			<h2>Server-side Inference (FastAPI)</h2>
			<form onSubmit={onSubmit}>
				<input
					type='file'
					accept='image/*'
					onChange={(e) => setFile(e.target.files?.[0] || null)}
				/>
				<button type='submit' disabled={!file || loading}>
					{loading ? "Running..." : "Run Inference"}
				</button>
			</form>

			{annotated && (
				<>
					<h3>Annotated Result</h3>
					<img src={annotated} style={{ maxWidth: "100%" }} />
				</>
			)}
			<canvas
				ref={tarp}
				width={640}
				height={640}
				style={{ display: "block", border: "1px solid #ccc", marginTop: 5 }}
			/>
			{!!preds.keypoints.length && (
				<>
					<h3>Predictions (raw)</h3>
					<pre style={{ whiteSpace: "pre-wrap" }}>
						{JSON.stringify(preds, null, 2)}
					</pre>
				</>
			)}
		</div>
	);
}
