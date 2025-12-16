import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";

interface Props {
  children: React.ReactNode;
  requireRole?: "patient" | "doctor";
}

export const ProtectedRoute: React.FC<Props> = ({ children, requireRole }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (requireRole && user.role !== requireRole) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
