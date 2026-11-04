import { VideoOff } from "lucide-react";
import { useContext, useState } from "react";

import { isStudyActive } from "../../../shared/study/studyActive";
import type { ModuleVideoData } from "../../../shared/teachMeWhy/modules/moduleTypes";
import { StudyStateContext } from "../../study/StudyStateContext";
import { useOnlineStatus } from "./useOnlineStatus";
import styles from "./ModuleVideo.module.css";

interface ModuleVideoProps {
  video: ModuleVideoData;
}

export function ModuleVideo({ video }: ModuleVideoProps) {
  const online = useOnlineStatus();
  const studyState = useContext(StudyStateContext);
  const [failed, setFailed] = useState(false);
  const [forceLoad, setForceLoad] = useState(false);
  const studyActive = isStudyActive(studyState?.session ?? null);

  if (!video.embeddingAllowed || studyActive || failed || (!online && !forceLoad)) {
    return (
      <div className={styles.placeholder} role="status">
        <VideoOff size={24} aria-hidden="true" />
        <p>
          {failed
            ? "Video could not be loaded. Check your connection."
            : studyActive
              ? "Videos are unavailable during study sessions."
              : !online
                ? "Can't confirm an internet connection. If you're online, try loading the video."
                : "This video cannot be embedded."}
        </p>
        <span>{video.title}</span>
        {!studyActive && video.embeddingAllowed && (
          <button
            type="button"
            className={styles.tryAgain}
            onClick={() => {
              setFailed(false);
              setForceLoad(true);
            }}
          >
            {failed ? "Try again" : "Load video"}
          </button>
        )}
      </div>
    );
  }

  const source = new URL(`https://www.youtube-nocookie.com/embed/${video.videoId}`);
  source.searchParams.set("start", String(video.startSeconds));
  source.searchParams.set("end", String(video.endSeconds));
  source.searchParams.set("rel", "0");

  return (
    <iframe
      className={styles.frame}
      src={source.toString()}
      title={video.title}
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      onError={() => setFailed(true)}
    />
  );
}
