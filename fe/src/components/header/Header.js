/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable array-callback-return */
import { useDispatch } from "react-redux";
import { uploadUser, discardUser } from "../../util/slice/userSlice";
import "./Header.css";
import ProfileBox from "../profileBox/ProfileBox";
import LoginBtn from "../loginBtn/LoginBtn";
import { useEffect, useRef } from "react";
import axios from "axios";

export default function Header({ searchVideos }) {
    // const user = useSelector(selectUser);
    const dispatch = useDispatch();
    const userRef = useRef(null);
    const searchInputRef = useRef(null);

    function navigateToGoogleLogin() {
        window.location.href = `${process.env.REACT_APP_API_PATH}/oauth2/authorization/google`;
    }

    function logoutGoogle() {
        window.location.href = `${process.env.REACT_APP_API_PATH}/logout`;
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
    }

    function getCookie(key) {
        var result = null;
        var cookie = document.cookie.split(";");
        cookie.some(function (item) {
            item = item.replace(" ", "");
            var dic = item.split("=");
            if (key === dic[0]) {
                result = dic[1];
                return true;
            }
        });
        return result;
    }

    function accessTokenReissue() {
        let access_token = localStorage.getItem("access_token");

        // access token이 있을 경우
        if (access_token) {
            // access token으로 사용자 인증 요청
            axios
                .post(`${process.env.REACT_APP_API_PATH}/api/valid`, {
                    accessToken: access_token,
                })
                .then((response) => {
                    return;
                })
                .catch((error) => {
                    // refresh token으로 access token 요청
                    const refresh_token = getCookie("refresh_token");

                    if (refresh_token) {
                        if (error.response.status === 401 && refresh_token) {
                            axios
                                .post(
                                    `${process.env.REACT_APP_API_PATH}/api/token`,
                                    {
                                        refreshToken: refresh_token,
                                    }
                                )
                                .then((result) => {
                                    access_token = result.data.accessToken;
                                    localStorage.setItem(
                                        "access_token",
                                        access_token
                                    );
                                    return;
                                });
                        }
                    }
                });
            // access token이 없을 경우
        } else {
            // refresh token으로 access token 요청
            const refresh_token = getCookie("refresh_token");

            if (refresh_token) {
                axios
                    .post(`${process.env.REACT_APP_API_PATH}/api/token`, {
                        refreshToken: refresh_token,
                    })
                    .then((result) => {
                        access_token = result.data.accessToken;
                        localStorage.setItem("access_token", access_token);
                        return;
                    });
            }
        }
    }

    function getMemberInfo() {
        fetch(`${process.env.REACT_APP_API_PATH}/api/member/info`, {
            method: "GET",
            headers: {
                Authorization: "Bearer " + localStorage.getItem("access_token"),
                "Content-Type": "application/json",
            },
        })
            .then((response) => response.json())
            .then((data) => {
                const userInfo = { email: data.email, nickname: data.nickname, userId: data.id, picture: data.picture};
                localStorage.setItem("user", JSON.stringify(userInfo));
                console.log(data);
                userRef.current = userInfo;
            })
            .catch((error) => console.log(error));
    }

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");
        const refresh_token = getCookie("refresh_token");

        if (token) {
            localStorage.setItem("access_token", token);
            window.location.replace("/");
        }

        if (refresh_token) {
            accessTokenReissue();
        }

        if (
            localStorage.getItem("access_token") &&
            !localStorage.getItem("user")
        ) {
            getMemberInfo();
        }

        // const userStr = localStorage.getItem("user");
        // if(userStr){
        // 	console.log("dispatching userInfo");
        // 	const userObj = JSON.parse(userStr);
        // 	dispatch(uploadUser({email:userObj.email, nickname:userObj.nickname}));
        // }

        const userStr = localStorage.getItem("user");
        console.log(userStr);
        if (userStr) {
            const userObj = JSON.parse(userStr);
            userRef.current = {
                email: userObj.email,
                nickname: userObj.nickname,
            };
        }
    }, []);

    function handleSearchVideos(e) {
        e.preventDefault();
        searchVideos(searchInputRef.current.value);
    }

    return (
        <div className="header">
            <img src="/orialzLogo.jpg" alt="logo" className="logo-img" />
            <form className="search-form">
                <div className="search-input-line">
                    <input
                        placeholder="검색어를 입력하세요"
                        className="search-form-input"
                        ref={searchInputRef}
                    ></input>
                </div>

                <button
                    onClick={handleSearchVideos}
                    className="search-form-btn"
                >
                    검색
                    {/* <img src="search.svg" alt='search' className="search-form-btn-icon"/> */}
                </button>
            </form>
            <div>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        dispatch(uploadUser());
                    }}
                >
                    인
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        dispatch(discardUser());
                        logoutGoogle();
                    }}
                >
                    아웃
                </button>
            </div>
            {userRef.current ? (
                <ProfileBox />
            ) : (
                <LoginBtn googleLogin={navigateToGoogleLogin} />
            )}

            {/* <button onClick={(e)=>{
                e.preventDefault();
                dispatch(uploadUser(userInfo));
            }}>테스트로그인</button>

            <button onClick={(e)=>{
                e.preventDefault();
                dispatch(discardUser());
            }}>테스트로그아웃</button>

            <button onClick={(e)=>{
                e.preventDefault();
                console.log(user);
            }}>리덕스확인</button> */}
        </div>
    );
}
