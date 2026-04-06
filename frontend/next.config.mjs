/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel 배포 시 output 설정
  output: "standalone",
  // 외부 이미지 도메인 허용 (필요 시)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
