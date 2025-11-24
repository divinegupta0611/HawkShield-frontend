import { useEffect } from "react";
import { supabase } from "../SupabaseClient";

export default function AuthCallback() {
  useEffect(() => {
    const hash = window.location.hash.substring(1);  
    const params = new URLSearchParams(hash);

    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    if (access_token && refresh_token) {
      supabase.auth.setSession({
        access_token,
        refresh_token,
      }).then(() => {
        localStorage.setItem("isLoggedIn", "true");
        window.location.href = "/"; // redirect home
      });
    } else {
      console.error("No tokens found in redirect URL");
      window.location.href = "/login";
    }
  }, []);

  return <p>Authorizing… please wait</p>;
}
