import { useEffect } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import * as Pages from "@/app/app-route-registry";

const { Index, CityHubPage } = Pages;

export function DashboardCommRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/orbit${search}`} replace />;
}

export function MarketplaceC2CDetailRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/annonces/${id}` : "/annonces"} replace />;
}

export function PricingScrollRedirect() {
  useEffect(() => {
    const el = document.getElementById("pricing");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }, []);
  return <Index />;
}

export const CityServicesPage = () => <CityHubPage subPage="services" />;
export const CityActivitiesPage = () => <CityHubPage subPage="activities" />;
export const CityConciergePage = () => <CityHubPage subPage="concierge" />;
