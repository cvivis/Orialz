package com.orialz.backend.streaming.service;


import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.bramp.ffmpeg.FFmpeg;
import net.bramp.ffmpeg.FFmpegExecutor;
import net.bramp.ffmpeg.FFprobe;
import net.bramp.ffmpeg.builder.FFmpegBuilder;
import net.bramp.ffmpeg.probe.FFmpegProbeResult;
import net.bramp.ffmpeg.probe.FFmpegStream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Future;


@Service
@RequiredArgsConstructor
@Slf4j
public class StreamingService {

    private final FFmpeg ffmpeg;
    private final FFprobe ffprobe;

    @Value("${video.path}")
    private String rootPath;
    Long videoId = 1L;
    LocalDateTime date = LocalDateTime.of(2023,9,12,12,30,30);

    public File videoPlay(Long videoId,String fileName) throws NoSuchAlgorithmException {
//        log.info("fileName: "+fileName); // fileName에 ts파일 이름이 들어옴
        // 디비에서 해당 영상의 주소 가져와서 플레이


        String hashPath = hashingPath(videoId,date);
        Long userId = 1L;
        String path = rootPath+"/"+ userId+"/"+ hashPath+"/hls";

        return new File(path+"/"+fileName);
    }

    public String upload(MultipartFile file){

        if (!file.isEmpty()) {

            // 파일을 저장할 path
            log.info("fileName: "+file.getOriginalFilename());
            // 해당 path 에 파일의 스트림 데이터를 저장
            try {
                File f1 = new File(rootPath+"/"+file.getOriginalFilename());
                file.transferTo(f1);// 파일 옮기기
                convertToHls(file.getOriginalFilename(),file.getOriginalFilename());
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        }
        return file.getOriginalFilename();
    }


    @Async
    public Future<Boolean> chunkUpload(MultipartFile file, String fileName,int chunkNumber, int totalChunkNum,Long userId) throws IOException, NoSuchAlgorithmException {
        if (!file.isEmpty()) {
            String path = rootPath + "/" + userId; //임시 폴더 + 실제
            File output = new File(path); // 폴더 위치
            if (!output.exists()) { // 사용자 파일이 없으면 생성
                output.mkdirs();
            }

            String partFile = fileName + ".part" + chunkNumber; //임시 저장 파일 이름
            Path filePath = Paths.get(path, partFile);
            log.info("filePath: "+String.valueOf(filePath));
            Files.write(filePath, file.getBytes());

            // 마지막 조각이 전송 됐을 경우
            if (chunkNumber == totalChunkNum - 1) {
                // 디비에 영상 삽입. status = 0;
                // 디비에서 가지고온 videoId , createAt


                String hashing = hashingPath(videoId,date);
                String videoPath = path + "/"+hashing;

                File hashFolder = new File(videoPath); // 폴더 위치
                if (!hashFolder.exists()) { // 사용자 파일이 없으면 생성
                    hashFolder.mkdirs();
                }

                Path outputFile = Paths.get(videoPath, fileName);
                Files.createFile(outputFile);

                // 임시 파일들을 하나로 합침
                for (int i = 0; i < totalChunkNum; i++) {
                    Path chunkFile = Paths.get(path, fileName + ".part" + i);
                    Files.write(outputFile, Files.readAllBytes(chunkFile), StandardOpenOption.APPEND);
                    // 합친 후 삭제
                    Files.delete(chunkFile);
                }
                log.info("File uploaded successfully");
                convertToHls(videoPath,fileName);
                return CompletableFuture.completedFuture(true);
            }
            else{
                log.info("Not Last");
                return CompletableFuture.completedFuture(true);
            }
        }
        else{
            log.info("File Not Exist");
            return CompletableFuture.completedFuture(false);
        }
    }


    public void convertToHls(String hashPath , String filename) throws IOException {
        String path = hashPath+"/"+filename;
        String hlsPath = hashPath+"/hls";
        File output = new File(hlsPath);
        FFmpegProbeResult probeResult = ffprobe.probe(path);
        String audioCodec = "";
        for (FFmpegStream stream : probeResult.getStreams()) {
            System.out.println(stream.codec_type);
            if(FFmpegStream.CodecType.AUDIO.equals(stream.codec_type)){
                System.out.println("codecName: "+stream.codec_name);
                audioCodec = stream.codec_name;

            }

//            if (stream.codec_name.toLowerCase().startsWith("h264")) {
//                System.out.println("스트림 타입: " + stream.codec_type);
//                System.out.println("B-프레임 갯수: " + stream.has_b_frames);
//                System.out.println("I-프레임 간격: " + stream.nb_frames);
//            }
        }
        if (!output.exists()) {
            output.mkdirs();
        }

        FFmpegBuilder builder = new FFmpegBuilder()
                .setInput(path) // 입력 소스
                .overrideOutputFiles(true)
                .addOutput(output.getAbsolutePath() + "/output.m3u8") // 출력 위치
                .setAudioCodec(audioCodec)
                .setFormat("hls")
                .disableSubtitle()
                .addExtraArgs("-hls_time", "5") // 5초
                .addExtraArgs("-hls_list_size", "0")
                .addExtraArgs("-hls_segment_filename", output.getAbsolutePath() + "/output_%08d.ts") // 청크 파일 이름
                .done();

        FFmpegExecutor executor = new FFmpegExecutor(ffmpeg, ffprobe);
        executor.createJob(builder).run();
        log.info("success Convert HLS");
    }


    public String hashingPath(Long userId, LocalDateTime createAt) throws NoSuchAlgorithmException {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

        // LocalDateTime을 문자열로 포맷
        String formattedDateTime = createAt.format(formatter);

        String path = userId + "_"+formattedDateTime;
        log.info("path: "+path);
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] hashBytes = md.digest(path.getBytes());

        StringBuilder hexString = new StringBuilder();
        for (byte b : hashBytes) {
            hexString.append(String.format("%02x", b));
        }

        String sha256Hash = hexString.toString();
//        log.info("SHA-256 Hash: " + sha256Hash);
        return sha256Hash;
    }


//    @Async
//    public Future<String> asyncTest() throws InterruptedException {
//        for(int i = 0; i < 10; i++){
//            log.info("i"+i);
//            if(i == 9){
//                asyncAct();
//                return CompletableFuture.completedFuture("now");
//            }
//        }
//        return CompletableFuture.completedFuture("success");
//    }
//
//
//
//    public void asyncAct() throws InterruptedException {
//        for(int i = 0; i<10;i++) {
//            Thread.sleep(1);
//            log.info("비동기처리중 " + i);
//        }
//    }


}
