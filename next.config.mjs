/** @type {import('next').NextConfig} */
// ⚠️ Este proyecto NO debe vivir dentro de OneDrive: OneDrive corrompe la carpeta de
// build .next (placeholders -> EINVAL readlink -> ChunkLoadError / 500 en runtime).
// distDir/junctions NO lo resuelven (Node resuelve symlinks a ruta real y rompe la
// resolución de node_modules). La solución es mover el repo fuera de OneDrive.
// Ver dashboard/ONEDRIVE.md para los pasos exactos.
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
