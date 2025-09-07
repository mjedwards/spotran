/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from "react";

const PUBLISHABLE = import.meta.env.VITE_ROBOFLOW_PUBLISHABLE_KEY as string;
const MODEL_NAME = "jumper";
const MODEL_VERSION = "1";

export default function WebcamDemo() {
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	const engineRef = useRef<any>(null);
	const workerIdRef = useRef<string | null>(null);
	const rafRef = useRef<number | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const [ready, setReady] = useState(false);
	const [running, setRunning] = useState(false);

	useEffect(() => {
		const script = document.createElement("script");
		script.src = "https://cdn.jsdelivr.net/npm/inferencejs";
		script.onload = () => setReady(true);
		document.body.appendChild(script);

		return () => {
			stop();
			document.body.removeChild(script);
		};
	}, []);

	const loop = async () => {
		if (!running) return;
		const v = videoRef.current!,
			c = canvasRef.current!,
			ctx = c.getContext("2d")!;
		ctx.drawImage(v, 0, 0, c.width, c.height);

		try {
			const preds = await engineRef.current!.infer(workerIdRef.current!, v);
			ctx.font = "14px system-ui";
			ctx.strokeStyle = "lime";
			ctx.fillStyle = "lime";
			preds.forEach((p: any) => {
				const x = p.bbox.x - p.bbox.width / 2;
				const y = p.bbox.y - p.bbox.height / 2;
				ctx.strokeRect(x, y, p.bbox.width, p.bbox.height);
				ctx.fillText(`${p.class} ${(p.score ?? 0).toFixed(2)}`, x + 4, y + 14);
			});
		} catch (e) {
			console.warn(e);
		}
		rafRef.current = requestAnimationFrame(loop);
	};

	async function start(constraints: MediaTrackConstraints) {
		if (!ready) {
			alert("Inference library not loaded yet.");
			return;
		}
		if (running) return;
		if (
			!location.hostname.includes("localhost") &&
			location.protocol !== "https:"
		) {
			alert("Webcam requires HTTPS (or localhost).");
			return;
		}

		try {
			// camera
			const stream = await navigator.mediaDevices.getUserMedia({
				video: constraints,
				audio: false,
			});
			streamRef.current = stream;
			if (videoRef.current) {
				videoRef.current.srcObject = stream;
				await videoRef.current.play();
			}

			// engine/worker
			if (!engineRef.current)
				engineRef.current = new (window as any).inferencejs.InferenceEngine();
			// workerIdRef.current = await engineRef.current.startWorker(
			// 	MODEL_NAME,
			// 	MODEL_VERSION,
			// 	PUBLISHABLE,
			// 	{ scoreThreshold: 0.5, iouThreshold: 0.5, maxNumBoxes: 25 }
			// );

			setRunning(true);
			// start the draw/infer loop once the video has data
			const startLoop = () => {
				if (rafRef.current) cancelAnimationFrame(rafRef.current);
				rafRef.current = requestAnimationFrame(loop);
			};
			if (videoRef.current!.readyState >= 2) startLoop();
			else videoRef.current!.onloadeddata = startLoop;
		} catch (e) {
			console.error(e);
			alert("Webcam not available or permission denied.");
			await stop(); // ensure we clean up partial state
		}
	}

	async function stop() {
		// stop loop
		setRunning(false);
		if (rafRef.current) {
			cancelAnimationFrame(rafRef.current);
			rafRef.current = null;
		}

		streamRef.current?.getTracks().forEach((t) => t.stop());
		streamRef.current = null;

		const ctx = canvasRef.current?.getContext("2d");
		if (ctx && canvasRef.current)
			ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

		if (engineRef.current && workerIdRef.current) {
			try {
				await engineRef.current.stopWorker(workerIdRef.current);
			} catch (err) {
				console.error(err);
			}
		}
		workerIdRef.current = null;
	}

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
			<div style={{ marginTop: 8, display: "flex", gap: 8 }}>
				<button
					disabled={!ready || running}
					onClick={() => start({ facingMode: "environment" })}>
					Start
				</button>
				<button disabled={!running} onClick={stop}>
					Stop
				</button>
			</div>
			<canvas
				ref={canvasRef}
				width={640}
				height={480}
				style={{ display: "block", border: "1px solid #ccc", marginTop: 12 }}
			/>
		</div>
	);
}
