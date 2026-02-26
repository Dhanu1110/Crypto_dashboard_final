import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { ThemeToggle } from "@/components/ThemeToggle";

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState("");
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
  const [emailPortfolioSummary, setEmailPortfolioSummary] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, email_alerts_enabled, email_portfolio_summary")
        .eq("id", user.id)
        .single();

      if (error) {
        toast.error("Failed to load profile");
      } else if (data) {
        setUsername(data.username ?? "");
        setEmailAlertsEnabled(data.email_alerts_enabled ?? true);
        setEmailPortfolioSummary(data.email_portfolio_summary ?? true);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        username: username.trim() || null,
        email_alerts_enabled: emailAlertsEnabled,
        email_portfolio_summary: emailPortfolioSummary,
      })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to save settings");
    } else {
      toast.success("Settings saved!");
    }
    setSaving(false);
  };

  const initials = username
    ? username.slice(0, 2).toUpperCase()
    : (user?.email?.slice(0, 2).toUpperCase() ?? "??");

  return (
    <ThemeProvider defaultTheme="dark">
      <div className="min-h-screen bg-gradient-hero">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b border-glass-border bg-glass/30 backdrop-blur-md sticky top-0 z-40"
        >
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <h1 className="text-xl font-bold text-foreground">Settings</h1>
            </div>
            <ThemeToggle />
          </div>
        </motion.header>

        <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Profile Section */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="bg-glass/30 border-glass-border backdrop-blur-md">
                  <CardHeader>
                    <CardTitle className="text-foreground">Profile</CardTitle>
                    <CardDescription>Manage your display name</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-16 w-16">
                        <AvatarFallback className="bg-primary/20 text-primary text-lg font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">{username || "No display name"}</p>
                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Display Name</Label>
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your display name"
                        className="bg-glass/20 border-glass-border"
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Email Preferences */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="bg-glass/30 border-glass-border backdrop-blur-md">
                  <CardHeader>
                    <CardTitle className="text-foreground">Email Preferences</CardTitle>
                    <CardDescription>Choose which notifications you receive</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Price Alert Notifications</Label>
                        <p className="text-xs text-muted-foreground">Get notified when your price alerts trigger</p>
                      </div>
                      <Switch checked={emailAlertsEnabled} onCheckedChange={setEmailAlertsEnabled} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Weekly Portfolio Summary</Label>
                        <p className="text-xs text-muted-foreground">Receive a weekly summary of your portfolio performance</p>
                      </div>
                      <Switch checked={emailPortfolioSummary} onCheckedChange={setEmailPortfolioSummary} />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Save */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-gradient-primary text-primary-foreground shadow-glow"
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </ThemeProvider>
  );
};

export default Settings;
