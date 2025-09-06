import UploadAndPredict from "./UploadAndPredict";
import WebcamDemo from "./WebcamDemo";

export default function App() {
	return (
		<div
			style={{
				maxWidth: 900,
				margin: "2rem auto",
				fontFamily: "system-ui, Arial",
			}}>
			<h1>Spotran × Roboflow</h1>
			<UploadAndPredict />
			<hr style={{ margin: "2rem 0" }} />
			<WebcamDemo />
		</div>
	);
}
