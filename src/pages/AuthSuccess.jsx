import { useEffect } from "react";
import { supabase } from "../SupabaseClient";

export default function AuthSuccess() {
  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        console.log("User not found after redirect:", error);
        return;
      }

      const user = data.user;

      // Build unified user object
      const googleUser = {
        name: user.user_metadata.full_name || user.user_metadata.name || "",
        email: user.email || "",
        avatar_url: user.user_metadata.avatar_url || user.user_metadata.picture || "",
        provider: user.app_metadata.provider || "google",
        isLoggedIn: true
      };

      // Save ONE object in localStorage
      localStorage.setItem("hawkshield_user", JSON.stringify(googleUser));
      localStorage.setItem("isLoggedIn", "true");

      // Redirect home
      window.location.href = "/";
    };

    fetchUser();
  }, []);

  return <h2>Finishing login…</h2>;
}
