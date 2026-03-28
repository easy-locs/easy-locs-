/**
 * SeasonalICalPanel — iCal import/export panel.
 * Pure UI. Actions delegated via callbacks.
 */
import { useState } from "react";
import { Download, Upload, X, Copy, Check, CalendarDays } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface Property {
  id: string;
  label: string;
}

interface Props {
  properties: Property[];
  selectedPropertyId: string;
  onPropertyChange: (id: string) => void;
  onImportUrl: (url: string) => Promise<void>;
  onImportFile: (file: File) => Promise<void>;
  onExportDownload: () => void;
  onExportCopy: () => void;
  onClose: () => void;
  importing: boolean;
}

export default function SeasonalICalPanel({
  properties, selectedPropertyId, onPropertyChange,
  onImportUrl, onImportFile, onExportDownload, onExportCopy,
  onClose, importing,
}: Props) {
  const { t } = useI18n();
  const [icalUrl, setIcalUrl] = useState("");
  const [copiedExport, setCopiedExport] = useState(false);

  const handleCopy = () => {
    onExportCopy();
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
  };

  return (
    <div className="bg-card rounded-xl border border-border/50 p-6 mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-accent" /> {t("page.seasonal.ical_sync_title")}
        </h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="text-sm text-muted-foreground">{t("page.seasonal.ical_import_desc")}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Import */}
        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Download className="h-4 w-4" /> {t("page.seasonal.import_airbnb")}
          </h4>
          <p className="text-xs text-muted-foreground">{t("page.seasonal.import_url_hint")}</p>
          <div className="flex gap-2">
            <input
              value={icalUrl}
              onChange={e => setIcalUrl(e.target.value)}
              placeholder="https://www.airbnb.fr/calendar/ical/..."
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              onClick={() => onImportUrl(icalUrl).then(() => setIcalUrl(""))}
              disabled={importing || !icalUrl.trim()}
              className="bg-accent/20 text-accent px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent/30 disabled:opacity-50"
            >
              {importing ? t("page.seasonal.importing") : t("page.seasonal.import")}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t("page.seasonal.or")}</span>
            <label className="text-xs text-accent hover:underline cursor-pointer flex items-center gap-1">
              <Upload className="h-3 w-3" /> {t("page.seasonal.upload_ics")}
              <input
                type="file"
                accept=".ics,.ical"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) onImportFile(file);
                  e.target.value = "";
                }}
                className="hidden"
              />
            </label>
          </div>
          {selectedPropertyId === "" && properties.length > 1 && (
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("page.seasonal.import_property_label")}</label>
              <select
                value={selectedPropertyId}
                onChange={e => onPropertyChange(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">{t("page.seasonal.default_property")}</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Export */}
        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Upload className="h-4 w-4" /> {t("page.seasonal.export_title")}
          </h4>
          <p className="text-xs text-muted-foreground">{t("page.seasonal.export_desc")}</p>
          <div className="flex gap-2">
            <button onClick={onExportDownload} className="flex items-center gap-2 bg-accent/20 text-accent px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent/30">
              <Download className="h-3.5 w-3.5" /> {t("page.seasonal.download_ics")}
            </button>
            <button onClick={handleCopy} className="flex items-center gap-2 border border-border text-foreground px-4 py-2 rounded-lg text-sm hover:bg-muted">
              {copiedExport ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedExport ? t("page.seasonal.copied") : t("page.seasonal.copy")}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground italic">{t("page.seasonal.export_hint")}</p>
        </div>
      </div>
    </div>
  );
}
