import { useState } from "react";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Sparkles, Download, Plus, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import Navbar from "@/components/landing/Navbar";

interface Experience {
  title: string;
  company: string;
  period: string;
  description: string;
}

interface Education {
  degree: string;
  school: string;
  year: string;
}

export default function CVGenerator() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [summary, setSummary] = useState("");
  const [skills, setSkills] = useState("");
  const [languages, setLanguages] = useState("");
  const [experiences, setExperiences] = useState<Experience[]>([{ title: "", company: "", period: "", description: "" }]);
  const [education, setEducation] = useState<Education[]>([{ degree: "", school: "", year: "" }]);
  const [generatedCV, setGeneratedCV] = useState("");
  const [generating, setGenerating] = useState(false);

  const addExperience = () => setExperiences([...experiences, { title: "", company: "", period: "", description: "" }]);
  const removeExperience = (i: number) => setExperiences(experiences.filter((_, idx) => idx !== i));
  const updateExperience = (i: number, field: keyof Experience, value: string) => {
    const copy = [...experiences];
    copy[i] = { ...copy[i], [field]: value };
    setExperiences(copy);
  };

  const addEducation = () => setEducation([...education, { degree: "", school: "", year: "" }]);
  const removeEducation = (i: number) => setEducation(education.filter((_, idx) => idx !== i));
  const updateEducation = (i: number, field: keyof Education, value: string) => {
    const copy = [...education];
    copy[i] = { ...copy[i], [field]: value };
    setEducation(copy);
  };

  const generateCV = async () => {
    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-cv", {
        body: {
          fullName, email, phone, city, country, summary, skills, languages, experiences, education,
        },
      });
      if (error) throw error;
      setGeneratedCV(data?.cv || "CV generation failed");
      toast.success("CV generated successfully!");
    } catch (err: any) {
      console.error("CV generation error:", err);
      toast.error(err?.message || "Failed to generate CV");
    } finally {
      setGenerating(false);
    }
  };

  const downloadCV = () => {
    const blob = new Blob([generatedCV], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fullName.replace(/\s+/g, "_")}_CV.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Free CV Generator — Easy-Locs" description="Create a professional CV for free with AI. Fill in your details and generate a polished resume instantly." />
      <Navbar />
      <div className="container mx-auto max-w-3xl px-4 pt-24 pb-16">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/explore" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6 text-accent" /> Free CV Generator
            </h1>
            <p className="text-sm text-muted-foreground">AI-powered professional CV in seconds</p>
          </div>
        </div>

        {generatedCV ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={() => setGeneratedCV("")} variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" /> Edit
              </Button>
              <Button onClick={downloadCV} size="sm">
                <Download className="h-4 w-4 mr-1" /> Download HTML
              </Button>
              <Button onClick={() => window.print()} variant="outline" size="sm">
                Print / Save PDF
              </Button>
            </div>
            <div
              className="bg-white text-black p-8 rounded-xl shadow-lg border print:shadow-none print:border-none"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(generatedCV, { USE_PROFILES: { html: true }, FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'], FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'] }) }}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Personal Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Full Name *</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" type="email" />
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 890" />
                </div>
                <div>
                  <Label className="text-xs">City</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Paris" />
                </div>
                <div>
                  <Label className="text-xs">Country</Label>
                  <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="France" />
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Professional Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Brief summary of your professional profile..." rows={3} />
              </CardContent>
            </Card>

            {/* Experience */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Work Experience</CardTitle>
                <Button onClick={addExperience} variant="ghost" size="sm"><Plus className="h-4 w-4 mr-1" /> Add</Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {experiences.map((exp, i) => (
                  <div key={i} className="border border-border/50 rounded-lg p-3 space-y-2 relative">
                    {experiences.length > 1 && (
                      <button onClick={() => removeExperience(i)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input value={exp.title} onChange={(e) => updateExperience(i, "title", e.target.value)} placeholder="Job Title" />
                      <Input value={exp.company} onChange={(e) => updateExperience(i, "company", e.target.value)} placeholder="Company" />
                      <Input value={exp.period} onChange={(e) => updateExperience(i, "period", e.target.value)} placeholder="2020 - 2023" />
                    </div>
                    <Textarea value={exp.description} onChange={(e) => updateExperience(i, "description", e.target.value)} placeholder="Key achievements..." rows={2} />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Education */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Education</CardTitle>
                <Button onClick={addEducation} variant="ghost" size="sm"><Plus className="h-4 w-4 mr-1" /> Add</Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {education.map((edu, i) => (
                  <div key={i} className="border border-border/50 rounded-lg p-3 relative">
                    {education.length > 1 && (
                      <button onClick={() => removeEducation(i)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Input value={edu.degree} onChange={(e) => updateEducation(i, "degree", e.target.value)} placeholder="Degree" />
                      <Input value={edu.school} onChange={(e) => updateEducation(i, "school", e.target.value)} placeholder="School" />
                      <Input value={edu.year} onChange={(e) => updateEducation(i, "year", e.target.value)} placeholder="2020" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Skills & Languages */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Skills & Languages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Skills (comma-separated)</Label>
                  <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="JavaScript, Project Management, Marketing..." />
                </div>
                <div>
                  <Label className="text-xs">Languages</Label>
                  <Input value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="English, French, Spanish..." />
                </div>
              </CardContent>
            </Card>

            <Button onClick={generateCV} disabled={generating} className="w-full" size="lg">
              {generating ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Generate Professional CV</>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
