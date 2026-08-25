const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const movies = [
  {
    slug: "big-buck-bunny",
    title: "Big Buck Bunny",
    year: 2008,
    durationSec: 596,
    rating: 8.1,
    genres: "Animation, Comedy",
    description:
      "Kelinci raksasa yang baik hati membalas kejahilan tiga hewan pengerat dengan cara yang tak terduga. Film animasi open-source legendaris dari Blender Foundation.",
    posterUrl:
      "https://storage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg",
    originalUrl:
      "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  },
  {
    slug: "elephants-dream",
    title: "Elephants Dream",
    year: 2006,
    durationSec: 653,
    rating: 7.3,
    genres: "Animation, Fantasy",
    description:
      "Dua karakter menjelajahi mesin surealis raksasa tempat mereka tinggal, memperdebatkan realitas dan imajinasi di dunia yang terus berubah.",
    posterUrl:
      "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg",
    originalUrl:
      "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  },
  {
    slug: "sintel",
    title: "Sintel",
    year: 2010,
    durationSec: 888,
    rating: 8.4,
    genres: "Animation, Adventure",
    description:
      "Seorang gadis pengembara menempuh perjalanan berbahaya demi mencari naga kecil yang pernah ia rawat dan temani.",
    posterUrl:
      "https://storage.googleapis.com/gtv-videos-bucket/sample/images/Sintel.jpg",
    originalUrl:
      "https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  },
  {
    slug: "tears-of-steel",
    title: "Tears of Steel",
    year: 2012,
    durationSec: 734,
    rating: 7.9,
    genres: "Sci-Fi, Action",
    description:
      "Sekelompok pejuang dan ilmuwan berkumpul di Amsterdam untuk menyelamatkan dunia dari robot pemusnah — contoh demo streaming HLS multi-kualitas.",
    posterUrl:
      "https://storage.googleapis.com/gtv-videos-bucket/sample/images/TearsOfSteel.jpg",
    originalUrl:
      "https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    hlsUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    hlsStatus: "ready",
    hlsQualities: '["360p","540p","720p","1080p"]',
  },
];

async function main() {
  for (const m of movies) {
    const { slug, ...data } = m;
    await prisma.movie.upsert({
      where: { slug },
      update: { rating: m.rating ?? null },
      create: { slug, ...data },
    });
  }
  const count = await prisma.movie.count();
  console.log(`Seed selesai. Total film: ${count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
