import { useSelector } from "react-redux";
import { Redirect } from "wouter";

// Client-side role gate for a route. The backend enforces the same roles on
// the API; this just keeps other roles from landing on pages they can't use.
export default function RoleRoute({ roles, children }) {
  const user = useSelector((state) => state.auth?.user || null);
  if (!user || !roles.includes(user.role)) return <Redirect to="/app/welcome" />;
  return children;
}
