import { CalibrationFlow } from "./calibration/CalibrationFlow";
import { useCalibrationPersistence } from "./hooks/useCalibrationPersistence";
import { IssuePanel } from "./issues/IssuePanel";
import { PrecomputePanel } from "./roles/PrecomputePanel";
import { ReviewPanel } from "./roles/ReviewPanel";
import { usePrecomputeRun } from "./roles/usePrecomputeRun";
import { useRoleReview } from "./roles/useRoleReview";
import { StudyHost } from "./study/StudyHost";
import { useParticipantVisibility } from "./study/useParticipantVisibility";

/** The raw 1 to 4 answer to how much CADT should do on its own, or null if unanswered */
function readAiAssistanceLevel(
  profile: ReturnType<typeof useCalibrationPersistence>["loadedProfile"]
) {
  const value = profile?.answers.aiAssistanceLevel;
  return typeof value === "number" ? value : null;
}

function AppScreens() {
  const { loadedProfile, loading, saveProfile, saveError } = useCalibrationPersistence();
  const visibility = useParticipantVisibility();
  const precompute = usePrecomputeRun();
  const review = useRoleReview();

  // The researcher's precompute command takes the window until it is done
  if (precompute.status !== "idle") {
    return <PrecomputePanel ui={precompute} />;
  }

  if (review.status !== "idle") {
    return <ReviewPanel ui={review} />;
  }

  if (loading) {
    return <p>Loading calibration...</p>;
  }

  // A resolved profile hands off to the issue panel, whether loaded on open or just saved
  if (loadedProfile) {
    return <IssuePanel aiAssistanceLevel={readAiAssistanceLevel(loadedProfile)} />;
  }

  // Calibration and consent never appear while a study session is active
  if (!visibility.calibrationAndConsent) {
    return <p>Loading calibration...</p>;
  }

  return <CalibrationFlow onComplete={saveProfile} saveError={saveError} />;
}

export function App() {
  return (
    <StudyHost>
      <AppScreens />
    </StudyHost>
  );
}
