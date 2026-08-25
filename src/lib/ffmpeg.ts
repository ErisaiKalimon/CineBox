import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ffmpegStaticPath from "ffmpeg-static";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { db } from "./db";
import { getS3Client, publicObjectUrl } from "./s3";
import type { QualityOption } from "./format";

const LADDER: Record<
  QualityOption,
  {
    height: number;
    width: number;
    videoBitrate: string;
    audioBitrate: string;
    bandwidth: number;
  }
> = {
  "360p": { height: 360, width: 640, videoBitrate: "800k", audioBitrate: "96k", bandwidth: 900_000 },
  "480p": { height: 480, width: 854, videoBitrate: "1400k", audioBitrate: "128k", bandwidth: 1_600_000 },
  "720p": { height: 720, width: 1280, videoBitrate: "2800k", audioBitrate: "128k", bandwidth: 3_100_000 },
  "1080p": { height: 1080, width: 1920, videoBitrate: "5000k", audioBitrate: "192k", bandwidth: 5_400_000 },
};

const runningMovies = new Set<string>();

export function isTranscoding(movieId: string): boolean {
  return runningMovies.has(movieId);
}

function resolveFfmpegBin(): string {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  if (ffmpegStaticPath) return ffmpegStaticPath;
  return "ffmpeg";
}

function exec(bin: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { windowsHide: true });
    let stderrTail = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      stderrTail = (stderrTail + chunk.toString()).slice(-8000);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(
            `FFmpeg keluar dengan kode ${code}. ${stderrTail.slice(-1500)}`
          )
        );
    });
  });
}

export async function startTranscode(
  movieId: string,
  qualities: QualityOption[]
): Promise<void> {
  const job = await db.transcodeJob.create({
    data: {
      movieId,
      qualities: JSON.stringify(qualities),
      status: "processing",
    },
  });
  await db.movie.update({
    where: { id: movieId },
    data: { hlsStatus: "processing" },
  });
  runningMovies.add(movieId);
  void runJob(job.id, movieId, qualities).finally(() =>
    runningMovies.delete(movieId)
  );
}

async function runJob(
  jobId: string,
  movieId: string,
  qualities: QualityOption[]
): Promise<void> {
  const outDir = path.join(os.tmpdir(), `hls-${jobId}`);
  try {
    const movie = await db.movie.findUnique({ where: { id: movieId } });
    if (!movie) throw new Error("Film tidak ditemukan");
    if (!movie.originalUrl) throw new Error("Film belum memiliki file video");

    await rm(outDir, { recursive: true, force: true });
    await mkdir(outDir, { recursive: true });

    const bin = resolveFfmpegBin();
    for (const q of qualities) {
      const cfg = LADDER[q];
      await exec(bin, [
        "-y",
        "-i",
        movie.originalUrl,
        "-vf",
        `scale=-2:${cfg.height}`,
        "-c:v",
        "libx264",
        "-b:v",
        cfg.videoBitrate,
        "-preset",
        "veryfast",
        "-profile:v",
        "main",
        "-c:a",
        "aac",
        "-b:a",
        cfg.audioBitrate,
        "-hls_time",
        "6",
        "-hls_playlist_type",
        "vod",
        "-hls_segment_filename",
        path.join(outDir, `${q}_%03d.ts`),
        path.join(outDir, `${q}.m3u8`),
      ]);
    }

    const variants = qualities
      .map((q) => ({ name: q, ...LADDER[q] }))
      .sort((a, b) => b.height - a.height);
    const masterLines = ["#EXTM3U", "#EXT-X-VERSION:3"];
    for (const v of variants) {
      masterLines.push(
        `#EXT-X-STREAM-INF:BANDWIDTH=${v.bandwidth},RESOLUTION=${v.width}x${v.height},NAME="${v.name}"`
      );
      masterLines.push(`${v.name}.m3u8`);
    }
    await writeFile(
      path.join(outDir, "master.m3u8"),
      masterLines.join("\n") + "\n",
      "utf8"
    );

    const s3 = getS3Client();
    const bucket = process.env.IS3_BUCKET!;
    const prefix = `videos/${movie.slug}/hls`;
    const files = await readdir(outDir);
    for (const file of files) {
      const body = await readFile(path.join(outDir, file));
      const contentType = file.endsWith(".m3u8")
        ? "application/vnd.apple.mpegurl"
        : file.endsWith(".ts")
          ? "video/mp2t"
          : "application/octet-stream";
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: `${prefix}/${file}`,
          Body: body,
          ContentType: contentType,
        })
      );
    }

    const hlsUrl = publicObjectUrl(`${prefix}/master.m3u8`);
    await db.movie.update({
      where: { id: movieId },
      data: {
        hlsUrl,
        hlsStatus: "ready",
        hlsQualities: JSON.stringify(variants.map((v) => v.name)),
      },
    });
    await db.transcodeJob.update({
      where: { id: jobId },
      data: { status: "ready", finishedAt: new Date() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.transcodeJob
      .update({
        where: { id: jobId },
        data: {
          status: "failed",
          error: message.slice(0, 2000),
          finishedAt: new Date(),
        },
      })
      .catch(() => undefined);
    await db.movie
      .updateMany({ where: { id: movieId }, data: { hlsStatus: "failed" } })
      .catch(() => undefined);
  } finally {
    await rm(outDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
