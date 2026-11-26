import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Clapperboard, LoaderCircle, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLazyGetShortVideosQuery, useLazyGetRecommendedVideosQuery } from "@/features/video/videoApi";

const guideTopics = [
  {
    terms: ["upload", "publish", "create video"],
    reply: "To publish a video, choose Upload in the top bar or sidebar. Add your video and thumbnail, enter a title and description, choose Shorts for a clip up to 60 seconds, then publish.",
  },
  {
    terms: ["short", "shorts", "reel", "quick video"],
    reply: "Open Shorts from the sidebar to browse vertical clips. When uploading, choose the Shorts format for a video that is 60 seconds or less.",
  },
  {
    terms: ["playlist", "collection", "save video"],
    reply: "Open a video and use Save to playlist to add it to a collection. Manage your collections from Playlists in the sidebar.",
  },
  {
    terms: ["history", "watched", "watch later"],
    reply: "Your signed-in watch history is available from Watch history in the sidebar. Opening a video records it in your history.",
  },
  {
    terms: ["profile", "account", "avatar", "picture", "dashboard"],
    reply: "Select your profile picture or name to open your dashboard. Your channel, account details, and creator tools are available there.",
  },
  {
    terms: ["like", "dislike", "subscribe", "follow"],
    reply: "Use Like or Dislike on a video's watch page, or follow a creator with Subscribe. Sign in to save these preferences to your account.",
  },
  {
    terms: ["community", "post", "tweet", "comment"],
    reply: "Visit Community from the sidebar to see posts and join conversations. You can also add comments from a video's watch page.",
  },
  {
    terms: ["search", "find a video"],
    reply: "Use the search field at the top of the home page to find videos by title. You can also ask me for a topic and I’ll look for matching videos.",
  },
];

const recommendationWords = /\b(recommend|suggest|show|find|watch|play|want|looking for|give me|discover)\b/gi;
const topicWords = /\b(some|a|an|the|me|good|great|best|video|videos|short|shorts|music|song|songs|clip|clips|recommend|suggest|show|find|watch|play|want|looking|for|give|discover|please|about|on|of)\b/gi;

function getAssistantResponse(prompt) {
  const normalized = prompt.toLowerCase();
  const isRecommendationRequest = /\b(recommend|suggest|show|find|watch|play|looking for|give me|discover)\b/.test(normalized);
  const asksForShorts = /\b(shorts?|reels?|quick clips?)\b/.test(normalized);
  const asksForMusic = /\b(music|songs?|audio)\b/.test(normalized);
  const topic = prompt
    .replace(recommendationWords, " ")
    .replace(topicWords, " ")
    .replace(/[?!.,]+/g, " ")
    .trim();

  if (!isRecommendationRequest && !asksForMusic && !asksForShorts) {
    const guide = guideTopics.find(({ terms }) => terms.some((term) => normalized.includes(term)));
    if (guide) return { text: guide.reply, kind: "guide" };
  }

  const kind = asksForShorts ? "shorts" : "videos";
  const category = asksForMusic ? "music" : asksForShorts ? "shorts" : "videos";
  const text = asksForShorts
    ? `I’ll look for ${topic ? `${topic} ` : ""}Shorts for you.`
    : asksForMusic
      ? `I’ll look for music-related videos${topic ? ` about ${topic}` : ""}.`
      : `I’ll look for videos${topic ? ` about ${topic}` : ""} that you can explore.`;

  return { text, kind, category, search: asksForMusic ? topic || "music" : topic };
}

function VideoSuggestions({ videos, kind }) {
  if (!videos?.length) {
    return (
      <p className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 text-xs leading-5 text-zinc-400">
        I couldn’t find a close match this time. Try a broader topic or ask for another category.
      </p>
    );
  }

  return (
    <div className="mt-3 grid gap-2">
      {videos.slice(0, 4).map((video) => (
        <Link
          key={video._id}
          to={`/watch/${video._id}`}
          className="group flex min-w-0 items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-2 transition hover:border-red-400/30 hover:bg-white/[0.05]"
        >
          <div className="relative size-[68px] shrink-0 overflow-hidden rounded-lg bg-zinc-900">
            {video.thumbnail && (
              <img src={video.thumbnail} alt="" className="size-full object-cover" />
            )}
            {kind === "shorts" && (
              <span className="absolute bottom-1 right-1 rounded bg-black/75 p-1 text-white">
                <Clapperboard className="size-3" />
              </span>
            )}
          </div>
          <span className="min-w-0">
            <span className="line-clamp-2 block text-xs font-semibold leading-5 text-zinc-100 group-hover:text-red-200">
              {video.title}
            </span>
            <span className="mt-1 block truncate text-[11px] text-zinc-500">
              {video.owner?.fullName || "Lets-do-it creator"}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}

export default function LocalGuideAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      text: "Hi! I’m your on-device Lets-do-it guide. Ask how to use the site, or tell me what you’d like to watch.",
      kind: "guide",
    },
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const [loadRecommended] = useLazyGetRecommendedVideosQuery();
  const [loadShorts] = useLazyGetShortVideosQuery();
  const inputRef = useRef(null);

  const submitPrompt = async (prompt = draft) => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isThinking) return;

    setDraft("");
    setIsThinking(true);
    const userId = `user-${Date.now()}`;
    const assistantId = `assistant-${Date.now()}`;
    setMessages((current) => [
      ...current,
      { id: userId, role: "user", text: trimmedPrompt },
      { id: assistantId, role: "assistant", text: "", kind: "pending" },
    ]);

    try {
      const answer = getAssistantResponse(trimmedPrompt);
      let videos;
      if (answer.kind === "shorts") {
        const result = await loadShorts().unwrap();
        const allShorts = result?.videos || [];
        const terms = answer.search.toLowerCase().split(/\s+/).filter(Boolean);
        videos = terms.length
          ? allShorts.filter((video) => terms.some((term) =>
              `${video.title} ${video.description}`.toLowerCase().includes(term),
            ))
          : allShorts;
      } else if (answer.kind === "videos") {
        const result = await loadRecommended(answer.search).unwrap();
        videos = result?.videos || [];
      }

      setMessages((current) => current.map((message) =>
        message.id === assistantId ? { ...answer, id: assistantId, role: "assistant", videos } : message,
      ));
    } catch (error) {
      setMessages((current) => current.map((message) =>
        message.id === assistantId
          ? {
              ...message,
              kind: "error",
              text: error?.data?.message || "I couldn’t load recommendations right now. Please try again.",
            }
          : message,
      ));
    } finally {
      setIsThinking(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="local-guide fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {isOpen && (
        <section
          aria-label="Lets-do-it local assistant"
          className="flex h-[min(620px,calc(100dvh-110px))] w-[min(390px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#111114] shadow-2xl shadow-black/50"
        >
          <header className="flex shrink-0 items-center justify-between border-b border-white/[0.08] bg-gradient-to-r from-red-500/[0.12] to-transparent px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-red-400/10 text-red-300">
                <Sparkles className="size-[18px]" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-zinc-100">Local guide</span>
                <span className="block text-[11px] text-zinc-500">Site help & video picks</span>
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Close assistant"
              onClick={() => setIsOpen(false)}
              className="text-zinc-400 hover:text-white"
            >
              <X />
            </Button>
          </header>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={`max-w-[92%] rounded-2xl px-3.5 py-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "rounded-br-md bg-red-600 text-white"
                    : message.kind === "error"
                      ? "rounded-bl-md border border-red-500/20 bg-red-500/[0.07] text-red-200"
                      : "rounded-bl-md border border-white/[0.07] bg-white/[0.035] text-zinc-300"
                }`}>
                  {message.kind === "pending" ? (
                    <span className="inline-flex items-center gap-2 text-zinc-400">
                      <LoaderCircle className="size-4 animate-spin" /> Checking videos…
                    </span>
                  ) : message.text}
                  {message.videos && <VideoSuggestions videos={message.videos} kind={message.kind} />}
                </div>
              </div>
            ))}
            {!isThinking && messages.length === 1 && (
              <div className="flex flex-wrap gap-2">
                {["How do I upload?", "Suggest music", "Show me Shorts"].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => submitPrompt(suggestion)}
                    className="rounded-full border border-white/[0.1] px-3 py-1.5 text-xs text-zinc-400 transition hover:border-red-400/30 hover:text-zinc-100"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            className="flex shrink-0 items-center gap-2 border-t border-white/[0.08] p-3"
            onSubmit={(event) => {
              event.preventDefault();
              submitPrompt();
            }}
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              aria-label="Ask the local guide"
              placeholder="Ask or describe what you want to watch…"
              maxLength={300}
              className="h-10 min-w-0 flex-1 rounded-xl border border-white/[0.09] bg-white/[0.04] px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-red-400/40"
              disabled={isThinking}
            />
            <Button
              type="submit"
              size="icon"
              aria-label="Send message"
              disabled={!draft.trim() || isThinking}
              className="size-10 bg-red-600 text-white hover:bg-red-500"
            >
              <Send />
            </Button>
          </form>
        </section>
      )}
      <Button
        type="button"
        aria-label={isOpen ? "Close local guide" : "Open local guide"}
        onClick={() => setIsOpen((open) => !open)}
        className="size-14 rounded-full bg-red-600 text-white shadow-xl shadow-red-950/40 transition hover:scale-105 hover:bg-red-500"
      >
        {isOpen ? <X className="size-5" /> : <MessageCircle className="size-5" />}
      </Button>
    </div>
  );
}
