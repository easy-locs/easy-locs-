import { useNavigate } from "react-router-dom";
import YouEditProfilePage from "@/components/orbit/you/subpages/YouEditProfilePage";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function EditProfilePage() {
  useUiEngine("editprofilepage");
  const navigate = useNavigate();
  return <YouEditProfilePage onBack={() => navigate("/me")} />;
}
