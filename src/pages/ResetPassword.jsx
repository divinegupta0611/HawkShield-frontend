// ResetPassword.jsx
import { useState } from "react";
import { supabase } from "../SupabaseClient";
import { useLocation, useNavigate } from "react-router-dom";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const query = useQuery();
  const navigate = useNavigate();

  const accessToken = query.get("access_token"); // Supabase sends this in URL

  const handleResetPassword = async (e) => {
    e.preventDefault();

    const { error } = await supabase.auth.updateUser({
      password,
    }, accessToken);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Password updated successfully!");
      setTimeout(() => navigate("/login"), 2000); // redirect to login
    }
  };

  return (
    <div>
      <h2>Reset Password</h2>
      <form onSubmit={handleResetPassword}>
        <input
          type="password"
          placeholder="Enter new password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Reset Password</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default ResetPassword;
