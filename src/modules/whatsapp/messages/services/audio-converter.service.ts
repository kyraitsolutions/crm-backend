import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs/promises";
import os from "os";
import path from "path";

// const ffmpegPath = require("ffmpeg-static")

ffmpeg.setFfmpegPath(ffmpegPath as unknown as string);

export class AudioConverterService {
  async convertWavToOgg(
    file: Express.Multer.File,
  ): Promise<Express.Multer.File> {
    const inputPath = path.join(os.tmpdir(), `${Date.now()}.wav`);
    const outputPath = path.join(os.tmpdir(), `${Date.now()}.ogg`);

    await fs.writeFile(inputPath, file.buffer);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec("libopus")
        .format("ogg")
        .on("end", () => resolve())
        .on("error", reject)
        .save(outputPath);
    });

    const buffer = await fs.readFile(outputPath);

    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});

    return {
      ...file,
      originalname: file.originalname.replace(/\.\w+$/, ".ogg"),
      mimetype: "audio/ogg",
      buffer,
      size: buffer.length,
    };
  }
}

export const audioConverterService = new AudioConverterService();
