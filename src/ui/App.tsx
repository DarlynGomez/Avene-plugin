import { CalibrationFlow } from "./calibration/CalibrationFlow";
import { useCalibrationPersistence } from "./hooks/useCalibrationPersistence";
import { IssuePanel } from "./issues/IssuePanel";
import { StudyHost } from "./study/StudyHost";

/** The raw 1 to 4 answer to how much CADT should do on its own, or null if unanswered */
function readAiAssistanceLevel(
  profile: ReturnType<typeof useCalibrationPersistence>["loadedProfile"]
) {
  const value = profile?.answers.aiAssistanceLevel;
  return typeof value === "number" ? value : null;
}

function AppScreens() {
  const { loadedProfile, loading, saveProfile, saveError } = useCalibrationPersistence();

  if (loading) {
    return <p>Loading calibration...</p>;
  }

  // A resolved profile hands off to the issue panel, whether loaded on open or just saved
  if (loadedProfile) {
    return <IssuePanel aiAssistanceLevel={readAiAssistanceLevel(loadedProfile)} />;
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
