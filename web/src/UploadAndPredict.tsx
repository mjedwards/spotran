/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL as string;

interface PointsInterface {
	x: number;
	y: number;
}

export default function UploadAndPredict() {
	const [file, setFile] = useState<File | null>(null);
	const [preds, setPreds] = useState<any[]>([]);
	const [annotated, setAnnotated] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const tarp = document.getElementById("cvs") as HTMLCanvasElement | null;

	const drawSkeleton = (context: any, points: PointsInterface) => {
		context.beginPath();
		context.moveTo(points.x, points.y);
	};

	// if (tarp) {
	//     const ctx = tarp.getContext("2d");

	//     if (ctx && preds && preds.keypoints) {
	//         for (let i = 0; i < keypoints.length; i++) {
	//             drawSkeleton(ctx, keypoints[i])
	//         }
	//     }
	// }

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!file) return;
		setLoading(true);
		const form = new FormData();
		form.append("file", file);
		const res = await fetch(`${API_URL}/pose`, {
			method: "POST",
			body: form,
		});
		const data = await res.json();
		console.log(data[1]);
		setPreds(data.predictions || []);
		setAnnotated(data.image_base64 || null);
		setLoading(false);
	}

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
			{!!preds.length && (
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
