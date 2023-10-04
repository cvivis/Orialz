
import React from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

export const VideoJS = (props) => {
	const videoRef = React.useRef(null);
	const playerRef = React.useRef(null);
	const blurIdx = React.useRef(0);
	// const curBlurKey = React.useRef(0);
	const realVideoRef = React.useRef(null);

	const blursRef = React.useRef([]);
	const blurAnimationRef = React.useRef();
	const timeBefore = React.useRef(-1);
	const {options, onReady, blurData} = props;

	React.useEffect(() => {
		// Make sure Video.js player is only initialized once
		if (!playerRef.current) {
			// The Video.js player needs to be _inside_ the component el for React 18 Strict Mode. 
			const videoElement = document.createElement("video-js");
			videoElement.classList.add('vjs-big-play-centered','vjs-16-9');
			videoRef.current.appendChild(videoElement);
			realVideoRef.current = videoElement;
			const player = playerRef.current = videojs(videoElement, options, () => {
				videojs.log('player is ready');
				onReady && onReady(player);
			});
		// You could update an existing player in the `else` block here
		// on prop change, for example:
		} else {
			const player = playerRef.current;

			player.autoplay(options.autoplay);
			player.src(options.sources);
		}
	}, [onReady, options, videoRef]);

	// Dispose the Video.js player when the functional component unmounts
	React.useEffect(() => {
		const player = playerRef.current;
		return () => {
			if (player && !player.isDisposed()) {
				player.dispose();
				playerRef.current = null;
				cancelAnimationFrame(blurAnimationRef.current);
			}
		};
	}, [playerRef]);

	function testDraw(){
		blurAnimationRef.current = window.requestAnimationFrame(drawBlur);
	}
	
	function fullscreen(){
		videoRef.current.requestFullscreen();
	}
	function createBlurElement(){
		blursRef.current.forEach((e)=>{e.remove()});
			

		// blurData[curBlurKey].forEach((e)=>{
		// 	const rect2 = realVideoRef.current.getBoundingClientRect();
		// 				const realZone = document.querySelector(".vjs-text-track-display");
		// 				const rect = realZone.getBoundingClientRect();
		// 				const blurSquare = document.createElement("div");
		// 				blurSquare.classList.add("blur-square");
		// 				blurSquare.style.position = "absolute";
		// 				blurSquare.style.top =  rect.height * e.y + "px";
		// 				blurSquare.style.left = rect.width * e.x +  (rect2.width - rect.width)/2 + "px";
		// 				blurSquare.style.height = e.h  + "%";
		// 				blurSquare.style.width = e.w * (rect.width/rect2.width) +  "%";	
		// 				blurSquare.style.backgroundColor = "rgba(0,0,0,0.1)";
		// 				blurSquare.style.zIndex = 5;
		// 				blurSquare.style.backdropFilter = "blur(20px)";
		// 				blursRef.current.push(blurSquare);
		// 				realVideoRef.current.appendChild(blurSquare);
		// })

		blurData.data[blurIdx.current].objects.forEach((e)=>{
						// 비디오 전체 크기
						const rect2 = realVideoRef.current.getBoundingClientRect();
						const realZone = document.querySelector(".vjs-text-track-display");
						// 비디오 실제 플레이부분 크기
						const rect = realZone.getBoundingClientRect();
						const blurSquare = document.createElement("div");
						blurSquare.classList.add("blur-square");
						blurSquare.style.position = "absolute";

						blurSquare.style.top =  rect.height * e.y + "px";
						blurSquare.style.left = rect.width * e.x +  (rect2.width - rect.width)/2 + "px";
						blurSquare.style.height = e.h * 100  + "%";
						blurSquare.style.width = e.w * (rect.width/rect2.width) * 100+  "%";	

						// blurSquare.style.top =  e.y + "px";
						// blurSquare.style.left = e.x + "px";
						// blurSquare.style.height = e.h  + "px";
						// blurSquare.style.width = e.w +  "px";	

						blurSquare.style.backgroundColor = "rgba(0,0,0,0.1)";
						blurSquare.style.zIndex = 5;
						blurSquare.style.backdropFilter = "blur(20px)";
						blursRef.current.push(blurSquare);
						realVideoRef.current.appendChild(blurSquare);
		})
	}
	function drawBlur(){

		let curTime = playerRef.current.currentTime();
		// 영상의 이전 부분으로 돌아갈 때
		let mode = 0;
		// 영상이 멈춰있을 때
		if(timeBefore.current === curTime){
			// console.log("영상멈춤");
			mode = 0;
		} else if(timeBefore.current > curTime){
			mode = -1;
			// blurIdx.current = Math.floor(curTime);
				// console.log("영상뒤로감");
		} else {
			mode = 1;
			// blurIdx.current = Math.floor(curTime);
			// console.log("영상앞으로감");
		}

		if(mode === 0){
		} else if(mode===1){
			if(curTime > blurData.data[blurIdx.current].time - 0.005){
				createBlurElement();
				blurIdx.current++;
			}
			
		} else if(mode === -1){
			if(curTime < blurData.data[blurIdx.current].time + 0.005){
				createBlurElement();
				blurIdx.current--;
			}
		}
		// console.log(curTime, blurIdx.current);
		
		
		timeBefore.current = curTime;
		blurAnimationRef.current = window.requestAnimationFrame(drawBlur);
	}

  	return (
		<div data-vjs-player id='videoZone'>
 			<div ref={videoRef} onClick={testDraw} onDoubleClick={fullscreen}>
				
			</div>
		</div>
  	);
}

export default VideoJS;