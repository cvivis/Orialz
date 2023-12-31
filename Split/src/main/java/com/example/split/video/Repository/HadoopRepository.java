package com.example.split.video.Repository;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;

import org.apache.hadoop.fs.FileSystem;
import org.apache.hadoop.fs.Path;
import org.springframework.stereotype.Component;

import com.example.split.config.HadoopConfiguration;
import com.example.split.video.domain.Entity.Job;
import com.example.split.video.domain.Entity.Video;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
@AllArgsConstructor
public class HadoopRepository {

	HadoopConfiguration hadoopConfiguration;

	static String remoteRoot = "hdfs://cluster1:9000";

	public void HDFSUpload(Job job) throws IOException {
		String localRootPath = job.getRoot();
		String member = job.getMember();
		String hash = job.getHash();

		FileSystem fileSystem = hadoopConfiguration.getFileSystem();

		Path remoteVideoPath = new Path("/user/hadoop/video");
		if(!fileSystem.exists(remoteVideoPath)){
			log.info("비디오 경로 생성");
			fileSystem.mkdirs(remoteVideoPath);
		}

		Path remoteMemberPath = new Path("/user/hadoop/video/"+member);
		if(!fileSystem.exists(remoteMemberPath)){
			log.info("유저 경로 생성");
			fileSystem.mkdirs(remoteMemberPath);
		}
		Path remoteHashPath = new Path("/user/hadoop/video/" + member + "/" + hash);
		if(!fileSystem.exists(remoteHashPath)){
			log.info("동영상 경로 생성");
			fileSystem.mkdirs(remoteHashPath);
		}

		File localImagePath = new File(localRootPath + "/" + member + "/" + hash + "/output");
		File[] files = localImagePath.listFiles();

		fileSystem.copyFromLocalFile(
			new Path(localRootPath + "/" + member + "/" + hash + "/frame_timeStamp.txt"),
			new Path(remoteRoot + "/user/hadoop/video/" + member + "/" + hash + "/frame_timeStamp.txt")
		);
		log.info("HDFS Input 파일 업로드 성공");
		File input = new File(localRootPath + "/" + member + "/" + hash + "/frame_timeStamp.txt");
		input.delete();
		log.info("Local Input 삭제");
		//img
		for(int i = 0; i < files.length; i++){
			fileSystem.copyFromLocalFile(
				new Path(localRootPath + "/" + member + "/" + hash + "/output/" + files[i].getName()),
				new Path(remoteRoot + "/user/hadoop/video/" + member + "/" + hash + "/output/" + files[i].getName())
			);
			log.info(files[i].getName()+"파일 업로드 및 삭제");
			files[i].delete();
		}
	}

	public boolean HDFSDownload(Job job) throws IOException {
		String localRootPath = job.getRoot();
		String member = job.getMember();
		String hash = job.getHash();
		String title = job.getTitle();
		FileSystem fileSystem = hadoopConfiguration.getFileSystem();
		Path remoteJson = new Path("/user/hadoop/video/" + member + "/" + hash + "/json/part-r-00000");
		Path localJson = new Path(localRootPath + "/" + member +"/"+hash+"/json/json.txt");
		fileSystem.copyToLocalFile(remoteJson,localJson);
		log.info("json 다운로드 성공");
		fileSystem.delete(new Path("/user/hadoop/video/" + member + "/" + hash +"/output"),true);
		fileSystem.delete(new Path("/user/hadoop/video/" + member + "/" + hash +"/" + title),true);
		log.info("이미지 및 동영상 삭제 성공");
		return true;
	}

	public boolean MapreduceRunJob(Job job) throws IOException, InterruptedException {
		String localRootPath = job.getRoot();
		String member = job.getMember();
		String hash = job.getHash();
		Video video = job.getVideo();
		ProcessBuilder processBuilder = new ProcessBuilder("hadoop",
			"jar",
			"/home/hadoop/jenkins/workspace/hadoop/build/libs/Hadoop-Gradle-1.0-SNAPSHOT.jar",
			"com.orialz.imgToJson",
			"video/" + member+"/"+hash+"/frame_timeStamp.txt",
			"video/" + member+"/"+hash+"/json"
		);
		Process start = processBuilder.start();
		BufferedReader br = new BufferedReader(new InputStreamReader(start.getInputStream()));
		BufferedReader er = new BufferedReader(new InputStreamReader(start.getErrorStream()));


		String line;
		while((line = br.readLine()) != null){
			// System.out.println(line);
			log.info("Hadoop out{}", line);
		}

		while((line = er.readLine()) != null){
			// System.out.println(line);
			log.info("Hadoop Err{}", line);
		}
		return start.waitFor() != 0;
	}
}
