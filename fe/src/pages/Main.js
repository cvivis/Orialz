/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import VideoContainer from "../components/videoContainer/VideoContainer";
import "./Main.css";
import axios from "axios";
import { useSearchParams } from "react-router-dom";

export default function Main() {

	const [searchedVideos, setSearchedVideos] = useState([]);
	const [searchParams] = useSearchParams();

	async function searchVideos(keyword){
		try {
			//응답 성공
			let response = undefined;
			if (keyword) {
				response = await axios.get(`https://test.orialz.com/api/video/search?keyword=${keyword}`, {});
			} else {
				response = await axios.get("https://test.orialz.com/api/video", {});
			}
			console.log(response);
			setSearchedVideos(response.data);
		} catch (error) {
			//응답 실패
			console.error(error);
		}
	}

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const token = params.get("token");
		
		if (token) {
		localStorage.setItem("access_token", token);
		window.location.replace("/");
		}
		
		const keyword = searchParams.get('keyword');
		searchVideos(keyword);
	}, []);

	return (
		<div className="main">
			<VideoContainer videos={searchedVideos}></VideoContainer>
		</div>
	);
}
