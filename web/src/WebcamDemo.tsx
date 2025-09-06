import React, { useEffect, useRef } from "react";
/* eslint-disable @typescript-eslint/no-explicit-any */

const PUBLISHABLE = import.meta.env.VITE_ROBOFLOW_PUBLISHABLE_KEY as string;
// set to your model name & version from Roboflow dashboard
const MODEL_NAME = "/jumper";
const MODEL_VERSION = "1";

export default function WebcamDemo() {
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		// load inferencejs script (or add in index.html)
		const script = document.createElement("script");
		script.src = "https://cdn.jsdelivr.net/npm/inferencejs";
		script.onload = start;
		document.body.appendChild(script);

		async function start() {
			try {
				if (
					!location.hostname.includes("localhost") &&
					location.protocol !== "https:"
				) {
					alert("Webcam requires HTTPS (or localhost).");
					return;
				}
				const stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: "environment" },
					audio: false,
				});
				if (videoRef.current) {
					videoRef.current.srcObject = stream;
					await videoRef.current.play();
				}

				const engine = new (window as any).InferenceEngine();
				const workerId = await engine.startWorker(
					MODEL_NAME,
					MODEL_VERSION,
					PUBLISHABLE,
					{
						scoreThreshold: 0.5,
						iouThreshold: 0.5,
						maxNumBoxes: 25,
					}
				);

				const loop = async () => {
					const v = videoRef.current!,
						c = canvasRef.current!,
						ctx = c.getContext("2d")!;
					ctx.drawImage(v, 0, 0, c.width, c.height);
					try {
						const preds = await engine.infer(workerId, v);
						ctx.font = "14px system-ui";
						ctx.strokeStyle = "lime";
						ctx.fillStyle = "lime";
						preds.forEach((p: any) => {
							const x = p.bbox.x - p.bbox.width / 2;
							const y = p.bbox.y - p.bbox.height / 2;
							ctx.strokeRect(x, y, p.bbox.width, p.bbox.height);
							ctx.fillText(
								`${p.class} ${(p.score ?? 0).toFixed(2)}`,
								x + 4,
								y + 14
							);
						});
					} catch (e) {
						console.warn(e);
					}
					requestAnimationFrame(loop);
				};
				videoRef.current!.onloadeddata = () => requestAnimationFrame(loop);
			} catch (e) {
				console.error(e);
				alert("Webcam not available or permission denied.");
			}
		}

		return () => {
			const v = videoRef.current;
			(v?.srcObject as MediaStream | undefined)
				?.getTracks()
				.forEach((t) => t.stop());
		};
	}, []);

	return (
		<div>
			<h2>Browser-side Inference (inferencejs)</h2>
			<video
				ref={videoRef}
				width={640}
				height={480}
				autoPlay
				playsInline
				style={{ border: "1px solid #ccc" }}
			/>
			<canvas
				ref={canvasRef}
				width={640}
				height={480}
				style={{ display: "block", border: "1px solid #ccc", marginTop: 12 }}
			/>
		</div>
	);
}
