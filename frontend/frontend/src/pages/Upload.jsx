import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link, Navigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clapperboard,
  FileVideo2,
  ImagePlus,
  LoaderCircle,
  UploadCloud,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePublishVideoMutation } from "@/features/video/videoApi";

function formatFileSize(bytes) {
  if (!bytes) return "0 KB";
  const sizeInMb = bytes / (1024 * 1024);
  return sizeInMb >= 1 ? `${sizeInMb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function UploadField({ id, label, description, file, accept, icon: Icon, preview, onChange, onClear, required }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-zinc-200">{label}</label>
        <span className="text-[11px] text-zinc-500">{required ? "Required" : "Optional"}</span>
      </div>
      <label
        htmlFor={id}
        className={`group relative flex min-h-44 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed transition ${
          file
            ? "border-red-400/30 bg-red-500/[0.04]"
            : "border-white/10 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.04]"
        }`}
      >
        {file ? (
          <>
            {preview ? (
              <>
                <img src={preview} alt={`${label} preview`} className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
              </>
            ) : (
              <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-red-950/30 via-[#19191f] to-[#101014]">
                <span className="grid size-14 place-items-center rounded-2xl border border-white/10 bg-black/20 text-red-200">
                  <Icon className="size-7" />
                </span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3.5 text-left">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-black/40 text-white backdrop-blur">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-white">{file.name}</span>
                  <span className="mt-0.5 block text-[11px] text-zinc-300">{formatFileSize(file.size)}</span>
                </span>
              </div>
              <span className="shrink-0 rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 text-[11px] font-medium text-white backdrop-blur">
                Change
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center px-5 py-7 text-center">
            <span className="mb-3 grid size-11 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-300 transition group-hover:border-red-400/20 group-hover:bg-red-400/10 group-hover:text-red-200">
              <Icon className="size-5" />
            </span>
            <span className="text-sm font-medium text-zinc-200">
              <span className="text-red-300">Choose a file</span> to browse your device
            </span>
            <span className="mt-1.5 text-xs text-zinc-500">{description}</span>
          </div>
        )}
        <input
          id={id}
          type="file"
          accept={accept}
          required={required}
          className="sr-only"
          onChange={(event) => onChange(event.target.files?.[0] || null)}
        />
      </label>
      {file && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 text-xs text-zinc-500 transition hover:text-zinc-200"
        >
          <X className="size-3.5" /> Remove file
        </button>
      )}
    </div>
  );
}

function Upload() {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [isShort, setIsShort] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [shortValidationError, setShortValidationError] = useState("");
  const [thumbnail, setThumbnail] = useState(null);
  const [videoPreview, setVideoPreview] = useState("");
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [publishVideo, { isLoading, isSuccess, error, reset }] = usePublishVideoMutation();

  useEffect(() => {
    if (!videoFile) {
      setVideoPreview("");
      return;
    }

    const url = URL.createObjectURL(videoFile);
    setVideoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  useEffect(() => {
    if (!thumbnail) {
      setThumbnailPreview("");
      return;
    }

    const url = URL.createObjectURL(thumbnail);
    setThumbnailPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnail]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!videoFile || !thumbnail) return;
    setShortValidationError("");
    if (isShort && (!videoDuration || videoDuration > 60)) {
      setShortValidationError(
        videoDuration > 60
          ? "Short videos must be 60 seconds or less."
          : "Wait for the video duration to load before publishing it as a Short.",
      );
      return;
    }

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("description", description.trim());
    formData.append("isShort", String(isShort));
    formData.append("videoFile", videoFile);
    formData.append("thumbnail", thumbnail);

    try {
      await publishVideo(formData).unwrap();
    } catch (submitError) {
      console.error("Video upload failed:", submitError);
    }
  };

  const clearForm = () => {
    setTitle("");
    setDescription("");
    setVideoFile(null);
    setVideoDuration(0);
    setShortValidationError("");
    setThumbnail(null);
    reset();
  };

  return (
    <div className="min-h-screen bg-[#0b0b0e] text-zinc-100">
      <header className="sticky top-0 z-20 flex h-[68px] items-center border-b border-white/[0.07] bg-[#0b0b0e]/90 px-4 backdrop-blur-xl sm:px-7">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition hover:text-white">
          <ArrowLeft className="size-4" />
          Back to videos
        </Link>
        <div className="ml-auto flex items-center gap-2 text-sm text-zinc-500">
          <span className="grid size-8 place-items-center rounded-lg bg-red-500/10 text-red-300">
            <Clapperboard className="size-4" />
          </span>
          Creator studio
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-7 sm:py-11">
        <div className="mb-8">
          <Badge variant="outline" className="mb-4 border-red-400/20 bg-red-400/[0.06] text-red-200">
            <UploadCloud data-icon="inline-start" />
            Publish
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-[40px]">Upload a video</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
            Share your next story with the community. Add the details and media below to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(310px,.85fr)]">
            <Card className="border-white/[0.08] bg-[#121216]">
              <CardHeader className="border-b border-white/[0.06] px-5 py-5 sm:px-6">
                <CardTitle className="text-base font-semibold text-white">Video details</CardTitle>
                <CardDescription className="text-zinc-500">Give viewers a reason to press play.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
                <label className="block space-y-2">
                  <span className="flex items-center justify-between gap-3 text-sm font-medium text-zinc-200">
                    Video title <span className="text-[11px] font-normal text-zinc-500">{title.length}/100</span>
                  </span>
                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value.slice(0, 100))}
                    required
                    maxLength={100}
                    placeholder="Give your video a clear, memorable title"
                    className="h-11 border-white/10 bg-white/[0.035] px-3.5 text-sm text-white placeholder:text-zinc-600 focus-visible:border-red-400/50 focus-visible:ring-red-400/10"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="flex items-center justify-between gap-3 text-sm font-medium text-zinc-200">
                    Description <span className="text-[11px] font-normal text-zinc-500">{description.length}/2,000</span>
                  </span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value.slice(0, 2000))}
                    required
                    maxLength={2000}
                    rows={6}
                    placeholder="What is this video about? Add context for your viewers..."
                    className="w-full resize-y rounded-lg border border-white/10 bg-white/[0.035] px-3.5 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-red-400/50 focus:ring-3 focus:ring-red-400/10"
                  />
                </label>

                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-zinc-200">Video format</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      { value: false, title: "Standard video", description: "Add to the regular video feed." },
                      { value: true, title: "Short", description: "Vertical-style video, up to 60 seconds." },
                    ].map((format) => (
                      <button
                        key={format.title}
                        type="button"
                        aria-pressed={isShort === format.value}
                        onClick={() => {
                          setIsShort(format.value);
                          setShortValidationError("");
                        }}
                        className={`rounded-xl border p-3 text-left transition ${
                          isShort === format.value
                            ? "border-red-400/40 bg-red-500/[0.08]"
                            : "border-white/10 bg-white/[0.025] hover:bg-white/[0.05]"
                        }`}
                      >
                        <span className="block text-sm font-medium text-zinc-100">{format.title}</span>
                        <span className="mt-1 block text-xs text-zinc-500">{format.description}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5">
                  <div className="flex items-start gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-400/10 text-emerald-300">
                      <CheckCircle2 className="size-4" />
                    </span>
                    <div>
                      <p className="text-xs font-medium text-zinc-200">Ready to publish</p>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        Your video will be visible to viewers after it has been uploaded.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/[0.08] bg-[#121216]">
              <CardHeader className="border-b border-white/[0.06] px-5 py-5 sm:px-6">
                <CardTitle className="text-base font-semibold text-white">Media files</CardTitle>
                <CardDescription className="text-zinc-500">Choose the video and its cover image.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
                <UploadField
                  id="videoFile"
                  label="Video file"
                  description={`MP4, WebM, or MOV · up to 500 MB${isShort ? " · 60 seconds max" : ""}`}
                  file={videoFile}
                  accept="video/mp4,video/webm,video/quicktime"
                  icon={FileVideo2}
                  preview={null}
                  required
                  onChange={(file) => {
                    setVideoFile(file);
                    setVideoDuration(0);
                    setShortValidationError("");
                  }}
                  onClear={() => {
                    setVideoFile(null);
                    setVideoDuration(0);
                    setShortValidationError("");
                  }}
                />
                {videoPreview && (
                  <video
                    src={videoPreview}
                    controls
                    preload="metadata"
                    onLoadedMetadata={(event) => setVideoDuration(event.currentTarget.duration)}
                    className="max-h-52 w-full rounded-xl border border-white/10 bg-black"
                  />
                )}
                {isShort && videoDuration > 0 && (
                  <p className={`text-xs ${videoDuration > 60 ? "text-red-300" : "text-zinc-500"}`}>
                    Duration: {Math.ceil(videoDuration)} seconds
                  </p>
                )}
                <UploadField
                  id="thumbnail"
                  label="Thumbnail"
                  description="JPG, PNG, or WebP · up to 5 MB"
                  file={thumbnail}
                  accept="image/jpeg,image/png,image/webp"
                  icon={ImagePlus}
                  preview={thumbnailPreview}
                  required
                  onChange={setThumbnail}
                  onClear={() => setThumbnail(null)}
                />
              </CardContent>
            </Card>
          </div>

          {(error || isSuccess || shortValidationError) && (
            <div
              role={error || shortValidationError ? "alert" : "status"}
              className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
                error || shortValidationError
                  ? "border-red-500/20 bg-red-500/[0.07] text-red-200"
                  : "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-200"
              }`}
            >
              {shortValidationError || error?.data?.message || (error && "Upload failed. Please try again.")
                || "Your video has been published successfully."}
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-zinc-600">
              By publishing, you confirm that you have the right to share this content.
            </p>
            <div className="flex gap-2">
              {isSuccess ? (
                <Button asChild variant="outline" className="border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.08]">
                  <Link to="/">Back to videos</Link>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearForm}
                  disabled={isLoading}
                  className="border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.08]"
                >
                  Clear form
                </Button>
              )}
              <Button
                type="submit"
                disabled={isLoading || isSuccess}
                className="min-w-36 bg-red-600 text-white shadow-lg shadow-red-950/30 hover:bg-red-500"
              >
                {isLoading ? <LoaderCircle className="animate-spin" /> : <UploadCloud />}
                {isLoading ? "Uploading..." : isSuccess ? "Published" : isShort ? "Publish short" : "Publish video"}
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

export default Upload;
