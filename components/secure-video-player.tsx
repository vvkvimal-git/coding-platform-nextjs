import { useState, useEffect } from "react";
import { Play, Loader2, AlertCircle } from "lucide-react";

interface SecureVideoPlayerProps {
  videoUrl: string;
  className?: string;
  style?: React.CSSProperties;
}

export function SecureVideoPlayer({ videoUrl, className, style }: SecureVideoPlayerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Revoke object URL on unmount to prevent memory leaks
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  const handlePlayClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (blobUrl) return; // already loaded
    setLoading(true);
    setError(null);
    try {
      const cacheName = "proctor-video-cache";
      const cache = await caches.open(cacheName);
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      // Construct the secure download URL
      const secureUrl = `${API_URL}/storage/video?url=${encodeURIComponent(videoUrl)}`;
      
      // Check if already in browser Cache API
      const cachedResponse = await cache.match(secureUrl);
      if (cachedResponse) {
        const blob = await cachedResponse.blob();
        const localUrl = URL.createObjectURL(blob);
        setBlobUrl(localUrl);
        setLoading(false);
        return;
      }

      // Fetch with Auth header
      const token = localStorage.getItem("accessToken");
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(secureUrl, { headers });
      if (!response.ok) {
        throw new Error(`Failed to fetch secure video stream (status ${response.status})`);
      }

      // Clone response to put in cache before reading body
      const responseToCache = response.clone();
      await cache.put(secureUrl, responseToCache);

      const blob = await response.blob();
      const localUrl = URL.createObjectURL(blob);
      setBlobUrl(localUrl);
    } catch (err: any) {
      console.error("Error loading secure video:", err);
      setError("Failed to load video.");
    } finally {
      setLoading(false);
    }
  };

  if (blobUrl) {
    return (
      <video
        src={blobUrl}
        controls
        autoPlay
        className={className}
        style={style}
      />
    );
  }

  return (
    <div
      className={`relative bg-black flex flex-col items-center justify-center cursor-pointer group hover:bg-slate-900 transition-colors ${className || ""}`}
      style={{ minHeight: "100%", width: "100%", display: "flex", ...style }}
      onClick={handlePlayClick}
    >
      {loading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="size-8 animate-spin text-purple-500" />
          <span className="text-[10px] text-slate-400 font-mono">Streaming Securely...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 text-red-500">
          <AlertCircle className="size-8 animate-pulse" />
          <span className="text-[10px] font-mono">{error}</span>
          <span className="text-[9px] text-slate-500">Click to retry</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="size-12 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
            <Play className="size-6 fill-white ml-1" />
          </div>
          <span className="text-[10px] text-slate-400 font-mono opacity-85 group-hover:opacity-100 transition-opacity">Click to Stream Evidence</span>
        </div>
      )}
    </div>
  );
}
