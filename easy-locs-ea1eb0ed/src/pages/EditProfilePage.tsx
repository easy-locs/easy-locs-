import { useNavigate } from "react-router-dom";
import YouEditProfilePage from "@/components/orbit/you/subpages/YouEditProfilePage";

export default function EditProfilePage() {
  const navigate = useNavigate();
  return <YouEditProfilePage onBack={() => navigate("/me")} />;
}
