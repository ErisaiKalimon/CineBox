import {
  S3Client,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const required = [
  "IS3_ENDPOINT_URL",
  "IS3_REGION",
  "IS3_ACCESS_KEY_ID",
  "IS3_SECRET_ACCESS_KEY",
  "IS3_BUCKET",
];

const results = [];
function step(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}

console.log("=== Tes Koneksi IS3 Storage ===\n");

// 1. Validasi environment
const missing = required.filter((k) => !process.env[k]);
step(
  "Variabel .env lengkap",
  missing.length === 0,
  missing.length ? `kurang: ${missing.join(", ")}` : "semua terisi"
);

const normalize = (u) => {
  const t = (u ?? "").trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(t) ? t : t ? `https://${t}` : "";
};

const endpoint = normalize(process.env.IS3_ENDPOINT_URL);
const publicBase = normalize(process.env.IS3_PUBLIC_BASE_URL);
const bucket = process.env.IS3_BUCKET;

if (!endpoint || !bucket || missing.length > 0) {
  console.log("\nLengkapi .env terlebih dahulu (lihat .env.example).");
  process.exit(1);
}

const s3 = new S3Client({
  region: process.env.IS3_REGION,
  endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.IS3_ACCESS_KEY_ID,
    secretAccessKey: process.env.IS3_SECRET_ACCESS_KEY,
  },
});

// 2. Kredensial + akses bucket
try {
  await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  step("Kredensial & bucket valid", true, `"${bucket}" dapat diakses`);
} catch (err) {
  step("Kredensial & bucket valid", false, err.message);
  printSummary();
  process.exit(1);
}

// 3. Upload file uji
const key = `test/is3-check-${Date.now()}.txt`;
const content = "tes koneksi cinebox " + new Date().toISOString();
let uploadOk = false;
try {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: content,
      ContentType: "text/plain",
    })
  );
  uploadOk = true;
  step("Upload objek uji", true, key);
} catch (err) {
  step("Upload objek uji", false, err.message);
}

// 4. Baca lewat API (signed)
if (uploadOk) {
  try {
    const res = await s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: key })
    );
    const body = await res.Body.transformToString();
    step("Baca ulang via API", true, `${body.length} byte`);
  } catch (err) {
    step("Baca ulang via API", false, err.message);
  }
}

// 5. Baca lewat URL publik (yang dipakai player video)
if (uploadOk && publicBase) {
  try {
    const res = await fetch(`${publicBase}/${key}`);
    const text = await res.text();
    const cocok = res.ok && text === content;
    step(
      "Akses URL publik",
      cocok,
      cocok
        ? publicBase
        : res.status === 403
          ? "403 — bucket belum mengizinkan public read"
          : `HTTP ${res.status}`
    );
  } catch (err) {
    step("Akses URL publik", false, err.message);
  }
} else if (!publicBase) {
  step("Akses URL publik", false, "IS3_PUBLIC_BASE_URL kosong");
}

// 6. Bersih-bersih
if (uploadOk) {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    step("Hapus objek uji", true, "selesai");
  } catch (err) {
    step("Hapus objek uji", false, err.message);
  }
}

printSummary();

function printSummary() {
  const passed = results.filter((r) => r.ok).length;
  console.log(`\nHasil: ${passed}/${results.length} tes lulus.`);
  const publik = results.find((r) => r.name === "Akses URL publik");
  if (passed === results.length) {
    console.log("IS3 siap dipakai! Jalankan aplikasi dan coba upload dari /admin.");
  } else if (publik && !publik.ok && passed >= results.length - 1) {
    console.log(
      "API storage berfungsi, TAPI bucket belum mengizinkan baca publik.\n" +
        "Aktifkan public read pada bucket di panel IS3 agar video bisa diputar."
    );
  }
  process.exit(passed === results.length ? 0 : 1);
}
