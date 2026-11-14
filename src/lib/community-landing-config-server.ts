import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { createKbAdminClient } from "@/lib/kb/auth";
import { supabaseConfigured } from "@/lib/supabase/server";
import {
  type CommunityLandingConfig,
  defaultCommunityLandingConfig,
  type FaqItem,
  type SchoolProfileField,
} from "@/lib/community-landing-config";

const LOCAL_CONFIG_PATH = path.join(process.cwd(), "src", "data", "community-landing-config.json");

function validateFields(val: unknown): SchoolProfileField[] | null {
  if (!Array.isArray(val)) return null;
  return val
    .filter((item) => item && typeof item === "object" && typeof item.label === "string" && typeof item.value === "string")
    .map((item) => ({ label: item.label.trim(), value: item.value.trim() }));
}

function validateFaq(val: unknown): FaqItem[] | null {
  if (!Array.isArray(val)) return null;
  return val
    .filter((item) => item && typeof item === "object" && typeof item.question === "string" && typeof item.answer === "string")
    .map((item, index) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id.trim() : `faq-${index + 1}`,
      question: item.question.trim(),
      answer: item.answer.trim(),
    }));
}

export async function getCommunityLandingConfig(): Promise<CommunityLandingConfig> {
  // 1. Try reading from Supabase microsite_settings
  if (supabaseConfigured()) {
    try {
      const admin = createKbAdminClient();
      const { data: site } = await admin
        .from("microsites")
        .select("id")
        .eq("slug", "sd-negeri-dukuhwaru-01")
        .maybeSingle();

      if (site) {
        const { data: row } = await admin
          .from("microsite_settings")
          .select("settings")
          .eq("microsite_id", site.id)
          .maybeSingle();

        const kbConfig = (row?.settings as Record<string, unknown> | undefined)?.kb_landing_config as Record<string, unknown> | undefined;
        if (kbConfig) {
          const left = validateFields(kbConfig.schoolProfileLeft);
          const right = validateFields(kbConfig.schoolProfileRight);
          const faq = validateFaq(kbConfig.faqItems);

          if (left && right && faq) {
            return {
              schoolProfileLeft: left,
              schoolProfileRight: right,
              faqItems: faq,
            };
          }
        }
      }
    } catch (error) {
      console.warn("Failed to fetch landing config from Supabase:", error);
    }
  }

  // 2. Try reading from local JSON file
  try {
    const raw = await fs.readFile(LOCAL_CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    const left = validateFields(parsed.schoolProfileLeft);
    const right = validateFields(parsed.schoolProfileRight);
    const faq = validateFaq(parsed.faqItems);
    if (left && right && faq) {
      return {
        schoolProfileLeft: left,
        schoolProfileRight: right,
        faqItems: faq,
      };
    }
  } catch {
    // fallback below
  }

  return defaultCommunityLandingConfig;
}

export async function saveCommunityLandingConfig(config: CommunityLandingConfig): Promise<boolean> {
  let savedToDb = false;

  // 1. Save to Supabase microsite_settings
  if (supabaseConfigured()) {
    try {
      const admin = createKbAdminClient();
      const { data: site } = await admin
        .from("microsites")
        .select("id")
        .eq("slug", "sd-negeri-dukuhwaru-01")
        .maybeSingle();

      if (site) {
        const { data: currentSettings } = await admin
          .from("microsite_settings")
          .select("settings")
          .eq("microsite_id", site.id)
          .maybeSingle();

        const existing = (currentSettings?.settings as Record<string, unknown>) ?? {};
        const updatedSettings = {
          ...existing,
          kb_landing_config: config,
        };

        const { error } = await admin
          .from("microsite_settings")
          .upsert(
            {
              microsite_id: site.id,
              settings: updatedSettings,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "microsite_id" }
          );

        if (!error) {
          savedToDb = true;
        } else {
          console.error("Supabase upsert error in landing config:", error);
        }
      }
    } catch (error) {
      console.error("Error saving landing config to Supabase:", error);
    }
  }

  // 2. Always attempt to write local file as persistent backup
  try {
    await fs.writeFile(LOCAL_CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
  } catch (error) {
    console.warn("Local JSON write warning:", error);
  }

  return savedToDb || true;
}

