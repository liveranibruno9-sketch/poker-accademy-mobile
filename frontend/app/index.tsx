import { Redirect } from "expo-router";
import { useApp } from "@/src/store/appStore";

export default function Index() {
  const onboarded = useApp((s) => s.profile.onboarded);
  return <Redirect href={onboarded ? "/(tabs)" : "/onboarding"} />;
}
